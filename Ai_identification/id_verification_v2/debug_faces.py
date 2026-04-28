"""
debug_faces.py  v2
───────────────────
Usage:
    python debug_faces.py --id path/to/id_card.jpg --selfie path/to/selfie.jpeg
"""

import argparse, os, sys
import cv2
import numpy as np
from pathlib import Path

OUT = Path("debug_output")
OUT.mkdir(exist_ok=True)
ARCFACE_SIZE = (112, 112)


def save(name, img):
    path = OUT / name
    cv2.imwrite(str(path), img)
    h,w = img.shape[:2]
    print(f"  saved -> {path}  ({w}x{h})")

def label_img(img, text, color=(0,255,0)):
    out = img.copy()
    cv2.putText(out, text, (8,22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,0), 3)
    cv2.putText(out, text, (8,22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color,   1)
    return out

def is_grayscale(img):
    if len(img.shape) == 2: return True
    b,g,r = cv2.split(img)
    return float(np.mean(np.abs(b.astype(int)-g.astype(int)))) < 5

def _area(bbox):
    x1,y1,x2,y2 = bbox
    return max(0,x2-x1)*max(0,y2-y1)


# ── Preprocessing (same as face_embedder._prepare) ───────────────────────────

def prepare(crop, label=""):
    img = crop.copy()

    # 1. ensure 3-channel
    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 1:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    # 2. grayscale enhancement
    if is_grayscale(img):
        print(f"    [{label}] grayscale -> CLAHE + denoise")
        gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4,4))
        gray  = clahe.apply(gray)
        gray  = cv2.fastNlMeansDenoising(gray, h=7)
        img   = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    # 3. upscale small crops BEFORE resizing to 112
    h, w = img.shape[:2]
    if max(h, w) < 160:
        scale = 160 / max(h, w)
        img   = cv2.resize(img, (int(w*scale), int(h*scale)),
                           interpolation=cv2.INTER_LANCZOS4)
        print(f"    [{label}] upscaled {w}x{h} -> {img.shape[1]}x{img.shape[0]}")

    # 4. sharpen to recover compression detail
    kernel = np.array([[ 0, -1,  0],
                       [-1,  5, -1],
                       [ 0, -1,  0]], dtype=np.float32)
    img = cv2.filter2D(img, -1, kernel)

    # 5. resize to ArcFace input
    return cv2.resize(img, ARCFACE_SIZE, interpolation=cv2.INTER_LANCZOS4)


# ── Detection ─────────────────────────────────────────────────────────────────

def load_detector():
    print("\n[1] Loading RetinaFace ...")
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="buffalo_l", allowed_modules=["detection"],
                       providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640,640), det_thresh=0.5)
    print("    RetinaFace ready")
    return app

def crop_face(app, image, lbl):
    faces = app.get(image)
    if not faces:
        print(f"    ERROR: No face in {lbl}"); sys.exit(1)
    face  = max(faces, key=lambda f: _area(f.bbox))
    H,W   = image.shape[:2]
    x1,y1,x2,y2 = face.bbox.astype(int)
    pad   = int(min(x2-x1, y2-y1)*0.20)
    x1=max(0,x1-pad); y1=max(0,y1-pad)
    x2=min(W,x2+pad); y2=min(H,y2+pad)
    print(f"    {lbl}: {len(faces)} face(s)  conf={face.det_score:.3f}  bbox=({x1},{y1})->({x2},{y2})  size={x2-x1}x{y2-y1}px")
    return image[y1:y2, x1:x2]

def crop_id_face(app, image):
    H,W   = image.shape[:2]
    roi   = image[0:int(H*0.78), 0:int(W*0.38)]
    faces = app.get(roi)
    if faces:
        face  = max(faces, key=lambda f: _area(f.bbox))
        x1,y1,x2,y2 = face.bbox.astype(int)
        pad   = int(min(x2-x1,y2-y1)*0.20)
        x1=max(0,x1-pad); y1=max(0,y1-pad)
        x2=min(W,x2+pad); y2=min(H,y2+pad)
        print(f"    ID ROI: {len(faces)} face(s)  conf={face.det_score:.3f}  bbox=({x1},{y1})->({x2},{y2})  size={x2-x1}x{y2-y1}px")
        return image[y1:y2, x1:x2]
    print("    No face in ROI -> fallback to full image")
    return crop_face(app, image, "ID full")


# ── Embedding ─────────────────────────────────────────────────────────────────

def load_embedder():
    print("\n[2] Loading ArcFace ...")
    from insightface.model_zoo import model_zoo
    mp = os.path.join(os.path.expanduser("~"),
                      ".insightface","models","buffalo_l","w600k_r50.onnx")
    rec = model_zoo.get_model(mp, providers=["CPUExecutionProvider"])
    rec.prepare(ctx_id=0)
    print("    ArcFace ready")
    return rec

def embed(rec, face112):
    raw = rec.get_feat(face112)
    vec = raw.flatten().astype("float32")
    return vec / np.linalg.norm(vec)


# ── Comparison image ──────────────────────────────────────────────────────────

def save_comparison(id112, live112, sim):
    S=224; GAP=40; TOP=90; BOT=70
    W=S*2+GAP+20; H=TOP+S+BOT
    canvas = np.full((H,W,3), 25, dtype=np.uint8)
    canvas[TOP:TOP+S, 10:10+S]               = cv2.resize(id112,   (S,S))
    canvas[TOP:TOP+S, 10+S+GAP:10+S*2+GAP]  = cv2.resize(live112, (S,S))

    color  = (0,220,0) if sim>=0.65 else (0,165,255) if sim>=0.45 else (0,0,220)
    verdict= "MATCH" if sim>=0.45 else "NO MATCH"
    f = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(canvas, f"{verdict}  similarity={sim:.4f}", (10,32), f, 0.8, color, 2)
    conf = "HIGH" if sim>=0.70 else "MEDIUM" if sim>=0.55 else "LOW" if sim>=0.45 else "NO_MATCH"
    cv2.putText(canvas, f"confidence: {conf}", (10,58), f, 0.6, (180,180,180), 1)
    cv2.putText(canvas, "ID Card",    (10,       TOP-8), f, 0.6, (180,180,180), 1)
    cv2.putText(canvas, "Selfie",     (10+S+GAP, TOP-8), f, 0.6, (180,180,180), 1)

    bx,by,bw,bh = 10, TOP+S+16, W-20, 14
    cv2.rectangle(canvas,(bx,by),(bx+bw,by+bh),(50,50,50),-1)
    cv2.rectangle(canvas,(bx,by),(bx+int(bw*max(0,min(1,sim))),by+bh),color,-1)
    cv2.putText(canvas,f"{sim*100:.1f}%",(bx+bw+6,by+11),f,0.5,(200,200,200),1)
    save("07_comparison.jpg", canvas)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id",     required=True)
    ap.add_argument("--selfie", required=True)
    args = ap.parse_args()

    id_img   = cv2.imread(args.id)
    live_img = cv2.imread(args.selfie)
    if id_img   is None: sys.exit(f"Cannot read: {args.id}")
    if live_img is None: sys.exit(f"Cannot read: {args.selfie}")

    print(f"\n{'='*60}")
    print(f"  ID     : {args.id}  [{id_img.shape[1]}x{id_img.shape[0]}]  {os.path.getsize(args.id)//1024}KB")
    print(f"  Selfie : {args.selfie}  [{live_img.shape[1]}x{live_img.shape[0]}]  {os.path.getsize(args.selfie)//1024}KB")
    print(f"{'='*60}")

    # Step 0: originals
    print("\n[STEP 0] Originals")
    save("00_id_original.jpg",   id_img)
    save("00_live_original.jpg", live_img)

    # Step 1: ID ROI
    H,W    = id_img.shape[:2]
    id_roi = id_img[0:int(H*0.78), 0:int(W*0.38)]
    print(f"\n[STEP 1] ID ROI [{id_roi.shape[1]}x{id_roi.shape[0]}]")
    save("01_id_roi.jpg", label_img(id_roi,"ROI"))

    # Step 2: detect
    det = load_detector()
    print("\n[STEP 2] Detecting faces")
    id_raw   = crop_id_face(det, id_img)
    live_raw = crop_face(det, live_img, "Selfie")
    save("02_id_face_raw.jpg",   label_img(id_raw,   "ID raw"))
    save("05_live_face_raw.jpg", label_img(live_raw, "Selfie raw"))
    print(f"\n  ID face grayscale?  {is_grayscale(id_raw)}")
    print(f"  Selfie grayscale?   {is_grayscale(live_raw)}")

    # Step 3: prepare
    print("\n[STEP 3] Preprocessing for ArcFace")
    id_prep   = prepare(id_raw,   "ID")
    live_prep = prepare(live_raw, "Selfie")
    save("03_id_face_arcface_input.jpg",   label_img(id_prep,   "ArcFace 112x112"))
    save("06_live_face_arcface_input.jpg", label_img(live_prep, "ArcFace 112x112"))

    # Step 4: embed + compare
    print("\n[STEP 4] Embedding & similarity")
    rec = load_embedder()
    sim = float(np.dot(embed(rec, id_prep), embed(rec, live_prep)))
    conf = "HIGH" if sim>=0.70 else "MEDIUM" if sim>=0.55 else "LOW" if sim>=0.45 else "NO_MATCH"

    print(f"\n{'='*60}")
    print(f"  similarity : {sim:.4f}")
    print(f"  match      : {'YES ✓' if sim>=0.45 else 'NO ✗'}  (threshold=0.45)")
    print(f"  confidence : {conf}")
    print(f"{'='*60}")

    save_comparison(id_prep, live_prep, sim)
    print(f"\nDone! Check: debug_output\\07_comparison.jpg\n")

if __name__ == "__main__":
    main()