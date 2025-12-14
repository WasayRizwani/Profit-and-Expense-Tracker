import sys
print("Python version:", sys.version)
try:
    import langchain
    print(f"LangChain version: {langchain.__version__}")
    import langchain.agents
    print(f"Agents dir: {dir(langchain.agents)}")
except Exception as e:
    print(f"Error: {e}")
