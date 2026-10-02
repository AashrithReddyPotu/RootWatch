FROM python:3.14-slim
WORKDIR /service
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY generator ./generator
COPY mock_data ./mock_data
COPY sql ./sql
ENV MOCK_MODE=true
ENV MOCK_SEED=true
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
