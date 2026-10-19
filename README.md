# H2T-shooting

Game bắn canh góc theo lượt (kiểu Gunny) chạy trên trình duyệt, có tài khoản và cơ sở dữ liệu PostgreSQL.

- **Hai chế độ:** Đấu đội (1v1, 2v2, 3v3, 4v4 với máy, 2 người cùng máy hoặc online) và Đánh boss (2–4 người, 6 boss theo 6 bậc).
- **Phong cách kiếm hiệp cổ trang:** mọi người chơi là một thiếu hiệp búi tóc, đuôi tóc dài; nón, áo, vũ khí, nhẫn hiện trực tiếp lên nhân vật (5 kiểu × 6 bậc mỗi ô), thêm vật phẩm hỗ trợ, dây chuyền, vòng tay.
  - Vũ khí: Thiền Trượng, Trường Kiếm, Cung, Thiết Phiến, Hồng Anh Thương.
  - Nón: Nón Lá, Kim Quan, Mũ Cánh Chuồn, Mũ Trụ, Đầu Đới.
  - Áo: Đạo Bào, Chiến Giáp, Phi Phong, Lân Giáp, Võ Phục.
  - Nhẫn: Nhẫn Ngọc, Nhẫn Ấn, Nhẫn Phỉ Thúy, Nhẫn Long Trảo, Nhẫn Phượng Quan.
- **6 vật phẩm hỗ trợ:** Hồi Xuân Đan (hồi máu), Kim Chung Tráo (tạo giáp), Hỏa Phù (tăng sát thương, nổ rộng), Hàn Băng Châu (đóng băng mục tiêu 1 lượt, boss kháng), Lông Hạc (hiện đường đạn, bỏ qua gió, hồi thể lực), Đại Hoàn Đan (tăng nộ).
- **6 bậc trang bị:** Cơ bản → Hoàng cấp → Huyền cấp → Địa cấp → Thiên cấp → Tuyệt cấp. Mỗi bậc phải nâng đủ 3 level, tỉ lệ thành công giảm dần.
- **Nâng cấp cần nguyên liệu và vàng.** Nguyên liệu rơi từ boss hoặc do admin tạo.
- **Cửa hàng:** bảo rương ngẫu nhiên và Tiệm vũ khí (chọn kiểu Thiền Trượng/Trường Kiếm/Cung/Thiết Phiến/Hồng Anh Thương, bậc Cơ bản → Huyền cấp).
- **Giao diện trận đấu kiểu điện thoại:** vòng điều khiển tròn bên trái (giữa hiện góc bắn), ô kỹ năng/vật phẩm vuông, thước lực 0–100, thanh HP / TL (thể lực) / NL (nộ), nút POW (tuyệt kỹ) và nút Bắn tròn bên phải. Phím tắt: mũi tên/WASD, Space để bắn, 1–4 chọn kỹ năng.
- **Kỹ năng đặc biệt cộng dồn** (bấm nhiều lần để chồng, tối đa thêm 4 viên; x2 và Bay bấm lại để bỏ; nút ↺ hoặc phím Backspace huỷ hết, hoàn NL).
- **Trọng thương:** chỉ số mới **May mắn** (có trên Vũ khí, Dây chuyền, Nhẫn, Vòng tay) cho tỉ lệ gây Trọng thương ×2 sát thương, tối đa 35%. Trong trận máu và sát thương hiển thị ×100.
- **Kỹ năng đặc biệt (tốn NL, mỗi lượt có 100 NL):** +10% (10), +20% (20), +50% (40), x2 bắn 2 loạt mỗi loạt 70% (60), Bay theo viên đạn không gây sát thương (50), +1 viên mỗi viên 60% (30), +2 viên mỗi viên 45% (50). Phím 5 6 7 8 9 0 -.
- **Đạn theo vũ khí:** Thiền Trượng bắn chưởng khí, Cung bắn tên, Thương phóng thương, Kiếm chém kiếm khí, Thiết Phiến phóng ám khí; đạn to và sáng hơn theo bậc.
- **Nhạc nền theo bản đồ:** tạo bằng Web Audio (không cần file nhạc), mỗi bản đồ một giai điệu, đánh boss nhịp nhanh hơn. Nút Nhạc ở sảnh và trong trận.
- **Dây chuyền, vòng tay:** 5 kiểu mỗi loại (Ngọc Bội, Trường Mệnh Tỏa, Chuỗi Minh Châu, Tâm Ngọc, Nanh Hổ; Kim Trạc, Tràng Hạt, Lắc Xích, Hộ Uyển, Lắc Chuông).
- **Cửa hàng:** rương, Tiệm vũ khí, Tiệm đá & bùa (Đá cường hóa 60, Hoàng/Huyền/Địa/Thiên/Thần Tinh Thạch 1.500 / 5.000 / 15.000 / 40.000 / 100.000, Bùa may mắn 2.500, Bùa bảo hộ 4.000 vàng; mua ×1/×5/×10/×50).
- **Bán đồ:** nút Bán trên từng món, và Bán nhanh trong Túi đồ (bán mọi món chưa mặc từ Cơ bản đến bậc chọn, theo ô đang lọc; bấm 2 lần để xác nhận).
- **6 boss vẽ riêng, có chuyển động:** Gấu Đá (đá + rêu), Kim Sư Vương (bờm lửa, vương miện), Huyền Quy Lão Tổ (mai phát sáng, cầu phép bay quanh), Địa Ma Vương (dung nham, sừng, lửa vai), Thiên Lôi Điểu (vẫy cánh, sét), Thần Long Thái Cổ (rồng phương Đông thân uốn lượn, sừng hươu, râu dài, ngọc rồng). Đạn boss cũng theo từng boss.
- **Phòng & Chat (online):** xem ai đang online, chat thế giới, tạo phòng (đấu đội 1v1/2v2 hoặc đánh boss), mời người đang online vào phòng (họ nhận lời mời bật lên), chat trong phòng và trong trận, sẵn sàng / đổi đội / mời ra. Ô trống do máy chơi. Ai thoát giữa trận thì máy chơi thay; chủ phòng thoát thì trận bị huỷ.
- **Sát thương lan:** vụ nổ trúng ai cũng mất máu, kể cả chính mình và đồng đội (chỉ sát thương lên đối thủ mới được tính vào thống kê và nộ). Gió từ -5 đến 5.
- **Voice chat trong phòng:** bấm "Vào voice" để nói chuyện trực tiếp với mọi người cùng phòng (WebRTC, cần cho phép micro). Có Tắt/Bật mic, tắt tiếng từng người, khung tên sáng lên khi ai đang nói; voice giữ nguyên khi vào trận (nút mic trên thanh công cụ).
- **8 bản đồ giang hồ:** Trúc Lâm, Đại Mạc, Thiên Sơn, Hỏa Diệm Sơn, Cổ Thành, Bồng Lai, Đông Hải, Hoa Sơn (rừng trúc, cờ trận, đèn đá, đèn lồng, chùa tháp phía xa); camera kéo được, phóng to/thu nhỏ, bản đồ thu nhỏ (minimap), chơi màn hình ngang trên điện thoại.

## Cấu trúc thư mục

```
h2t-shooting/
├── server.js        Máy chủ: phục vụ game và API (tài khoản, nâng cấp, phần thưởng, admin)
├── db.js            Lưu trữ: PostgreSQL khi có DATABASE_URL, nếu không thì file JSON
├── social.js        WebSocket /ws: online, chat, phòng, lời mời, chuyển dữ liệu trận online
├── package.json     Thư viện: pg (PostgreSQL), ws (WebSocket)
├── render.yaml      Cấu hình Render (web service + PostgreSQL)
└── public/
    ├── index.html   Giao diện
    ├── game.js      Đồ họa, trận đấu, sảnh
    ├── rules.js     Luật game dùng chung cho trình duyệt và server
    └── assets/      Bộ hình kiếm hiệp, gộp thành 9 trang atlas WebP
        ├── atlas.js     Toạ độ từng hình trong atlas
        └── *.webp       char, tier, armor, hat, ring, weapon, icons, use
tools/
├── kiemhiep/        Bộ hình kiếm hiệp vẽ bằng SVG (art.js, gear.js, items.js) + render.py xuất WebP
├── pack_atlas.py    Gộp lại atlas khi thêm/sửa hình
└── draw_icons.py    Công cụ vẽ icon cũ (không còn dùng cho bộ hình mới)
```

## Bộ hình kiếm hiệp

- Toàn bộ hình nhân vật, trang bị, icon, vật phẩm, nguyên liệu và hào quang được vẽ bằng SVG trong `tools/kiemhiep/` rồi xuất ra WebP. Không dùng ảnh của game khác.
- Nhân vật ghép theo thứ tự: hào quang → vòng chân → thân → áo → nhẫn → nón → vũ khí. Bậc hào quang = bậc trung bình của Vũ khí, Nón, Áo. Vòng chân là vòng bát quái, đổi màu và hoạ tiết theo bậc.
- Bảng màu theo bậc: Cơ bản (vải xám, gỗ) → Hoàng cấp (vàng hoàng gia, đá đỏ) → Huyền cấp (tím than, bạc) → Địa cấp (cam đất, ngọc bích) → Thiên cấp (trắng mây, xanh trời, tường vân) → Tuyệt cấp (đỏ son, vàng ròng, lửa).
- Mã kiểu đồ trong dữ liệu (`staff`, `wizard`, `robe`...) giữ nguyên như bản trước để hồ sơ đã lưu vẫn dùng được; chỉ tên hiển thị và hình đổi.
- Sửa hoặc vẽ thêm hình:

```bash
pip install playwright pillow && playwright install chromium
python tools/kiemhiep/render.py /tmp/hinh          # vẽ toàn bộ 335 hình
python tools/pack_atlas.py /tmp/hinh public/assets  # gộp lại thành atlas
```

- Xem thử khi đang vẽ: `python tools/kiemhiep/render.py --preview "[{svg:KH.dress({armor:'robe',hat:'wizard',weapon:'sword',ring:'solitaire'},3),w:512,h:512}]" xem.png`

## Chạy thử trên máy

Cần Node.js 18 trở lên.

```bash
npm install
npm start
```

Mở http://localhost:3000. Khi không đặt `DATABASE_URL`, dữ liệu lưu vào `data/dev-db.json`.

Muốn chạy với PostgreSQL trên máy:

```bash
DATABASE_URL=postgres://user:matkhau@localhost:5432/h2t npm start
```

Bảng dữ liệu (`users`, `profiles`) được tạo tự động khi server khởi động.

## Đưa lên GitHub

```bash
git init
git add .
git commit -m "H2T-shooting"
git branch -M main
git remote add origin https://github.com/<tên-của-bạn>/h2t-shooting.git
git push -u origin main
```

## Triển khai lên Render + Neon PostgreSQL

### Bước 1: tạo database trên Neon

1. Đăng nhập https://console.neon.tech, tạo **Project** mới (chọn region gần người chơi, ví dụ Singapore `aws-ap-southeast-1`).
2. Trong project, bấm **Connect**, bật **Connection pooling**, copy chuỗi kết nối dạng:
   `postgresql://<user>:<mật-khẩu>@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. Không cần tạo bảng: server tự tạo bảng `users`, `profiles` lần đầu khởi động.

### Bước 2: tạo web service trên Render

1. Đăng nhập https://dashboard.render.com, chọn **New → Blueprint**, kết nối GitHub và chọn repo `h2t-shooting`.
2. Render đọc `render.yaml` và hỏi 2 giá trị:
   - `DATABASE_URL`: dán chuỗi kết nối Neon ở bước 1.
   - `ADMIN_USERNAMES`: tên đăng nhập sẽ làm admin, ví dụ `tam` (nhiều tên cách nhau bằng dấu phẩy).
3. Bấm **Apply**, đợi build xong, mở đường dẫn dạng `https://h2t-shooting.onrender.com`. Mở `/api/health` phải thấy `"db":"postgres"`.
4. Đăng ký tài khoản đúng tên đã điền ở `ADMIN_USERNAMES`. Tab **Admin** sẽ hiện ra.

Mỗi lần bạn `git push` lên nhánh main, Render tự build lại. Đổi database sau này: Render → service → **Environment** → sửa `DATABASE_URL` → Save (Render tự khởi động lại).

### Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối Neon. Nhập khi tạo Blueprint, **không** ghi vào file trong repo. |
| `PGSSL` | `true`: bật SSL (Neon bắt buộc). Đã đặt sẵn trong `render.yaml`. |
| `SESSION_SECRET` | Khóa ký phiên đăng nhập. Blueprint tự sinh ngẫu nhiên. |
| `ADMIN_USERNAMES` | Tên đăng nhập có quyền admin, cách nhau bằng dấu phẩy. Bỏ trống thì tài khoản đăng ký **đầu tiên** thành admin. |
| `PORT` | Render tự đặt. |
| `TURN_URL`, `TURN_USER`, `TURN_PASS` | Không bắt buộc. Máy chủ TURN cho voice chat. Không đặt thì voice dùng STUN miễn phí của Google: chạy được với đa số mạng nhà/wifi, nhưng một số mạng di động 4G hoặc mạng công ty có thể không nối được. Khi đó thuê/tự dựng TURN (vd coturn, Metered, Twilio) rồi điền vào đây. |

### Lưu ý

- Web service miễn phí của Render **ngủ** khi lâu không có người vào; lần mở tiếp theo mất khoảng 1 phút để khởi động.
- Neon gói miễn phí tự tạm dừng database khi không dùng; lần truy vấn đầu sau đó chậm vài giây (server đã đặt thời gian chờ kết nối 15 giây). Dung lượng và giới hạn gói miễn phí xem trên trang giá của Neon.
- Dữ liệu nằm trên Neon nên không bị mất khi Render build lại hoặc xóa web service.
- Đã từng tạo database `h2t-db` trên Render bằng `render.yaml` cũ: Blueprint mới không còn quản lý nó; xóa tay trong Render nếu không dùng nữa.

## Admin

Trong tab **Admin**, admin có thể:

- Xem tổng số tài khoản, tạo tài khoản mới cho người chơi (tên, mật khẩu, quyền).
- Tìm người chơi theo tên.
- Cộng vàng, tạo nguyên liệu (Đá cường hóa, các loại Tinh Thạch, Bùa may mắn, Bùa bảo hộ).
- Tạo trang bị theo ô, bậc và level.
- Đặt lại hồ sơ của một người chơi.
- Cấp hoặc bỏ quyền admin cho người khác.

Mọi lần admin tặng đồ đều được ghi vào log của server trên Render.

## Trận online hoạt động thế nào

- Trình duyệt của **chủ phòng** chạy trận (giống trận thường), 15 lần/giây gửi trạng thái cho người khác qua máy chủ; người khác gửi phím bấm cho chủ phòng.
- Máy chủ lấy trang bị của từng người từ database, tạo trận và trả thưởng cho từng người khi chủ phòng báo kết quả (thưởng tính như đấu với máy cùng bậc).
- Chủ phòng nên có mạng ổn định và **để tab game mở** (trình duyệt dừng game khi tab bị ẩn lâu).
- Danh sách phòng và chat chỉ lưu trong bộ nhớ máy chủ: khi Render khởi động lại (deploy mới, hoặc gói free ngủ rồi thức dậy) thì phòng và chat cũ mất, hồ sơ người chơi vẫn còn.
- Render hỗ trợ WebSocket sẵn, không cần cấu hình thêm.

## Chống gian lận

- Tỉ lệ nâng cấp, phần thưởng và quà admin đều do **server** tính, trình duyệt không sửa được.
- Mật khẩu được băm bằng scrypt. Đăng nhập và đăng ký bị giới hạn số lần thử.
- Trận đấu mô phỏng trên trình duyệt, nên server chỉ kiểm tra được ở mức cơ bản: mỗi trận chỉ nhận thưởng một lần, và trận thắng ngắn hơn 15 giây không được tính. Muốn chống gian lận hoàn toàn thì cần chuyển phần mô phỏng trận đấu lên server.

## Không có máy chủ

Mở `public/index.html` trực tiếp (hoặc qua bất kỳ web tĩnh nào) thì game chạy ở chế độ chơi thử, lưu dữ liệu trên trình duyệt, tab Admin tác động lên chính hồ sơ của bạn.
