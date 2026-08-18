# FC Pack Opening Game (Open Source)

Game mở pack cầu thủ phong cách **FC Mobile / EA FC**, chạy hoàn toàn trên trình duyệt (HTML + CSS + JS).

## Tính năng

- **~3000 thẻ cầu thủ** từ khắp thế giới + ưu tiên cao OVR cho cầu thủ Việt Nam
- **OVR tối đa 125** (Công Hoàng Adminstration 130) với PlayStyle **Kim Cương (Diamond)**
- **Hầm (Walkout)** đặc biệt khi rút được cầu thủ OVR ≥ 115
- **Xu (Coins)**, **Gem**, **CD** (nạp)
- Nhiều loại Pack (xu / gem)
- Các mùa: Base, Champions, World Cup, TOTY, TOTS, GINGA, EURO, ASE, **GOLDEN DRAGON**, ICON, Heroes, CREATION, Adminstration
- Kho cầu thủ, Thị trường CN, Đội hình 4-3-3 + đá trận xếp hạng
- Sổ Siêu Sao / Sổ Siêu Sao Cao Cấp (CD)
- Đăng nhập localStorage, Giftcode, Admin
- Huấn luyện cầu thủ (tối đa cấp 30)

## Cách chạy

```bash
cd fc-pack-game
python3 -m http.server 8080
# Mở http://localhost:8080
```

Có thể mở trực tiếp `index.html` (data đã nhúng trong `js/players.js`).

## Cấu trúc

```
fc-pack-game/
├── index.html
├── css/
│   ├── style.css
│   └── cards.css
├── js/
│   ├── playstyles.js
│   ├── players.js      # Database nhúng
│   ├── modes.js
│   └── game.js
├── assets/
│   ├── cong_hoang_signature.png
│   └── cong_hoang_signature_white.png
├── data/
│   └── players.json
├── generate_players.py
└── README.md
```

## Tài khoản Admin

Đăng ký với tên: **CongHoang** (full) hoặc **anhduc** (hạn chế giftcode)

### Admin chính — tự set Rank

Trong **Admin Panel → 🏅 Tự thiết lập Rank**:
- Chọn rank (NHỰA → CHIẾN THẦN NEM CHUA) + số sao
- Nút **Max Chiến Thần 200★** / **Reset NHỰA 0★**
- Chỉ áp dụng cho tài khoản CongHoang đang đăng nhập

## Ghi chú

Project open source / fan-made. Không liên kết với EA Sports / FC Mobile.


## Cloud save (không mất data khi cập nhật)

Server Node **không cần npm install** — chỉ cần Node 18+.

### Chạy

```bash
cd fc-pack-game
node server.js
# Mở http://localhost:3000
```

Hoặc: `npm start`

- Save nằm trong **`data/saves/`**, user trong **`data/users.json`**
- Cập nhật `js/`, `css/`, `index.html` **thoải mái** — miễn **đừng xóa `data/`**
- Góc màn hình hiện **☁️ Cloud save ON** khi chạy qua server
- Mở file `index.html` trực tiếp = chỉ lưu máy (localStorage)

### Deploy free (Render / Railway / Fly.io)

1. Upload repo
2. Start command: `node server.js`
3. Gắn **persistent disk** vào thư mục `data` (hoặc env `DATA_DIR=/var/data`)

Khi redeploy code, disk `data/` giữ nguyên → **không mất tài khoản / kho thẻ**.
