from fastapi import FastAPI

app = FastAPI(
    title="AI IT Support — AI Services",
    version="1.0.0",
    docs_url="/docs"
)

@app.get("/")
async def root():
    return {"status": "ok", "service": "AI Services"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
