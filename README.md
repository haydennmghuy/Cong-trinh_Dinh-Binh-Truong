# 🏛 Đình Bình Trường — Dự Án Số Hóa Di Tích

Ứng dụng web tĩnh số hóa di tích lịch sử **Đình Bình Trường** (Quận Bình Thạnh, TP.HCM) — hỗ trợ song ngữ Việt-Anh, bản đồ tương tác, mô hình 3D AR.

---

## 🚀 Deploy lên GitHub Pages

```bash
# 1. Tạo repo trên GitHub (đặt tên: dinh-binh-truong)

# 2. Clone và push code
git init
git add .
git commit -m "feat: số hóa Đình Bình Trường v2"
git remote add origin https://github.com/<username>/dinh-binh-truong.git
git push -u origin main

# 3. Bật GitHub Pages:
#    Settings → Pages → Source: Deploy from branch → main → / (root)

# 4. Website live tại:
#    https://<username>.github.io/dinh-binh-truong/
```

---

## 📁 Cấu Trúc Dự Án

```
dinh-binh-truong/
├── index.html              # Trang chính (single-page app)
├── css/
│   └── style.css           # Design system + tất cả styles
├── js/
│   ├── translations.js     # Dữ liệu song ngữ VI/EN
│   ├── map-data.js         # Data 8 khu vực + timeline
│   ├── i18n.js             # Hệ thống chuyển ngôn ngữ
│   ├── interactive-map.js  # Bản đồ SVG tương tác + modal
│   └── app.js              # Logic chính + navigation
├── models/
│   └── dinh-binh-truong.glb   # ← Thay bằng model scan thực tế
├── audio/
│   ├── vi/                 # Audio thuyết minh tiếng Việt
│   └── en/                 # Audio thuyết minh tiếng Anh
└── images/
    └── hero/               # Ảnh nền hero section
```

---

## 🔄 Thay Thế Model 3D Thực Tế

Trong `index.html`, tìm thẻ `<model-viewer>` và thay dòng `src`:

```html
<!-- Từ (demo): -->
src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"

<!-- Sang (thực tế): -->
src="models/dinh-binh-truong.glb"
```

### Cách tạo model 3D thực tế:
1. **Quét**: Dùng iPhone Pro (LiDAR) hoặc drone + máy ảnh (photogrammetry)
2. **Xử lý**: Agisoft Metashape / RealityCapture / Polycam
3. **Export**: Xuất ra `.glb`, tối ưu bằng Blender (giảm polygon)
4. **Upload**: Đặt vào thư mục `models/`

---

## 🎙 Thêm Audio Thuyết Minh

Đặt file audio vào đúng thư mục:

```
audio/vi/cong-tam-quan.mp3      # Cổng Tam Quan
audio/vi/san-dinh.mp3           # Sân Đình
audio/vi/tien-dien.mp3          # Tiền Điện
audio/vi/chanh-dien.mp3         # Chánh Điện
audio/vi/hau-dien.mp3           # Hậu Điện
audio/vi/nha-vo-ca.mp3          # Nhà Võ Ca
audio/vi/cot-keo-go.mp3         # Cột Kèo Gỗ
audio/vi/bo-noc.mp3             # Bờ Nóc & Mái Ngói

audio/en/main-gate.mp3
audio/en/courtyard.mp3
audio/en/front-hall.mp3
audio/en/main-shrine.mp3
audio/en/rear-hall.mp3
audio/en/opera-stage.mp3
audio/en/wooden-columns.mp3
audio/en/roof-ridge.mp3
```

---

## 🖼 Thêm Ảnh Thực Tế

Thay thế placeholder bằng ảnh thực:

| Vị trí | Đường dẫn | Kích thước đề xuất |
|--------|-----------|-------------------|
| Hero background | `images/hero/dinh-bg.jpg` | 1920×1080px |
| About section | *(dùng SVG inline, không cần thay)* | — |

---

## ✅ Checklist Trước Khi Go Live

- [ ] Thay `src` model-viewer sang file `.glb` thực tế
- [ ] Upload ảnh hero `images/hero/dinh-bg.jpg`
- [ ] Thu âm và upload 16 file audio (8 VI + 8 EN)
- [ ] Kiểm tra trên mobile (iOS Safari + Android Chrome)
- [ ] Test AR button trên điện thoại thực
- [ ] Kiểm tra chuyển ngôn ngữ VI ↔ EN
- [ ] Deploy lên GitHub Pages và test đường dẫn

---

## 🌐 Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Core | HTML5 + CSS3 + Vanilla JS |
| Bản đồ | SVG tự vẽ + Intersection Observer |
| 3D / AR | Google `<model-viewer>` v3.4 |
| Font | Google Fonts (Playfair Display + Inter) |
| Song ngữ | Custom i18n với localStorage |
| Hosting | GitHub Pages (miễn phí) |

---

## 📞 Liên Hệ

- **Địa chỉ**: 334/9 Bình Lợi, Phường 13, Quận Bình Thạnh, TP.HCM
- **Google Maps**: [Đình Bình Trường](https://maps.google.com/?q=Đình+Bình+Trường+Bình+Thạnh)
