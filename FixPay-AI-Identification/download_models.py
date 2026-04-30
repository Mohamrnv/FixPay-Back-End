# download_models.py
from insightface.app import FaceAnalysis

print("Starting model download through API...")
try:
    # استخدام FaceAnalysis سيجبر المكتبة على تحميل الموديل برمجياً
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0)
    print("Models downloaded and verified successfully!")
except Exception as e:
    print(f"Error: {e}")