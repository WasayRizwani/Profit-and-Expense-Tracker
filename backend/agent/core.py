import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from .tools import (
    get_recent_sales_stats, 
    get_product_performance, 
    get_owner_balances, 
    get_top_expenses, 
    get_liability_summary,
    get_low_stock_items,
    search_product_inventory,
    get_daily_report_details,
    search_expenses
)

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_NAME = "gemini-robotics-er-1.5-preview"

# Tools
tools = [
    get_recent_sales_stats, 
    get_product_performance, 
    get_owner_balances, 
    get_top_expenses, 
    get_liability_summary,
    get_low_stock_items,
    search_product_inventory,
    get_daily_report_details,
    search_expenses
]

from langchain_community.chat_message_histories import SQLChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from database import SQLALCHEMY_DATABASE_URL

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    return SQLChatMessageHistory(
        session_id=session_id,
        connection_string=SQLALCHEMY_DATABASE_URL,
        table_name="chat_history"
    )

def get_agent_executor():
    if not GOOGLE_API_KEY:
        return None

    llm = ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=0,
        google_api_key=GOOGLE_API_KEY
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a highly capable Business Intelligence Assistant for 'TikTrack'.
        Your role is to assist with both Financial Analysis and Inventory Management.
        
        You have access to real-time data about sales, expenses, inventory levels, and owner equity.
        
        GUIDELINES:
        1. **Data Driven**: Always use the provided tools to fetch the latest data before answering. Do not guess.
        2. **Inventory Manager**: You can check stock levels, identify low-stock items, and search for product details.
        3. **Financial Analyst**: You can analyze revenue, profit, liabilities, and owner equity.
        4. **Clarity**: Interpret the data briefly and clearly. Format currency as £ (GBP).
        5. **Efficiency**: If you need multiple pieces of data, you may call tools sequentially.
        
        If a tool returns empty data, state that no data is available.
        """),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    # Wrap with message history
    agent_with_chat_history = RunnableWithMessageHistory(
        agent_executor,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
    )
    
    return agent_with_chat_history
