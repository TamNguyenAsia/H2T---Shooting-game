# H2T-shooting

Game bắn canh góc theo lượt (kiểu Gunny) chạy trên trình duyệt, có tài khoản và cơ sở dữ liệu PostgreSQL.

- **Hai chế độ:** Đấu đội (1v1, 2v2 với máy hoặc 2 người cùng máy) và Đánh boss (2–4 người, 6 boss theo 6 bậc).
- **Nhân vật như nhau, khác nhau ở trang bị:** mọi người chơi là pháp sư Sylva; nón, áo, vũ khí, nhẫn hiện trực tiếp lên nhân vật (5 kiểu × 6 bậc mỗi ô), thêm vật phẩm hỗ trợ, dây chuyền, vòng tay.
- **6 vật phẩm hỗ trợ:** Bình Hồi Phục, Khiên Pha Lê, Đá Rune Lửa (tăng sát thương, nổ rộng), Bom Băng Giá (đóng băng mục tiêu 1 lượt, boss kháng), Lông Vũ Gió (hiện đường đạn, bỏ qua gió, hồi thể lực), Tiên Dược Vàng (tăng nộ).
- **6 bậc trang bị:** Cơ bản → Hoàng cấp → Huyền cấp → Địa cấp → Thiên cấp → Tuyệt cấp. Mỗi bậc phải nâng đủ 3 level, tỉ lệ thành công giảm dần.
- **Nâng cấp cần nguyên liệu và vàng.** Nguyên liệu rơi từ boss hoặc do admin tạo.
- **Cửa hàng:** rương ngẫu nhiên và Tiệm vũ khí (chọn kiểu Trượng/Kiếm/Cung/Quyền Trượng/Thương, bậc Cơ bản → Huyền cấp).
- **Giao diện trận đấu kiểu điện thoại:** vòng điều khiển tròn bên trái (giữa hiện góc bắn), ô kỹ năng/vật phẩm vuông, thước lực 0–100, thanh HP / TL (thể lực) / NL (nộ), nút POW (tuyệt kỹ) và nút Bắn tròn bên phải. Phím tắt: mũi tên/WASD, Space để bắn, 1–4 chọn kỹ năng.
- **8 bản đồ,** camera kéo được, phóng to/thu nhỏ, bản đồ thu nhỏ (minimap), chơi màn hình ngang trên điện thoại.

## Cấu trúc thư mục

```
h2t-shooting/
├── server.js        Máy chủ: phục vụ game và API (tài khoản, nâng cấp, phần thưởng, admin)
├── db.js            Lưu trữ: PostgreSQL khi có DATABASE_URL, nếu không thì file JSON
├── package.json     Chỉ cần 1 thư viện: pg
├── render.yaml      Cấu hình Render (web service + PostgreSQL)
└── public/
    ├── index.html   Giao diện
    ├── game.js      Đồ họa, trận đấu, sảnh
    ├── rules.js     Luật game dùng chung cho trình duyệt và server
    └── assets/      Gói hình fantasy, gộp thành 8 trang atlas WebP
        ├── atlas.js     Toạ độ từng hình trong atlas
        └── *.webp       char, tier, armor, hat, ring, weapon, icons, use
tools/
└── pack_atlas.py    Gộp lại atlas khi thêm/sửa hình
```

## Gói hình

- Ảnh gốc PNG từ gói `fantasy_assets` đã được chuyển sang WebP (layer 512px, icon 160px), cắt viền trong suốt và gộp vào 8 trang atlas (~2,4 MB). Cả repo chỉ khoảng 20 file nên kéo thả lên GitHub web được (giới hạn 100 file mỗi lần).
- Thêm/sửa hình: để các file WebP theo cấu trúc tên cũ (`eq/<ô>/<kiểu>/<bậc>.webp`, `eq/<ô>/<kiểu>/<bậc>i.webp`, `items/<id>.webp`, `use/<id>.webp`, `tier/aura<bậc>.webp`, `tier/ring<bậc>.webp`, `char/body.webp`) vào một thư mục, rồi chạy `python tools/pack_atlas.py <thư-mục-hình> public/assets`.
- Nhân vật được ghép theo thứ tự trong manifest: hào quang → vòng chân → thân → áo → nhẫn → nón → vũ khí. Bậc hào quang = bậc trung bình của Vũ khí, Nón, Áo.
- Kiểu trang bị (Trượng, Kiếm, Cung…; Mũ Phù Thủy, Vương Miện…) chỉ đổi ngoại hình và tên, không đổi chỉ số. Đồ mới rơi ra có kiểu ngẫu nhiên; admin chọn được kiểu khi tạo đồ.
- Dây chuyền và vòng tay chưa có hình trong gói nên vẫn dùng icon vẽ bằng code.
- Hồ sơ cũ được tự nâng cấp khi đăng nhập: đồ cũ được gán kiểu cố định theo mã món đồ, Kính ngắm đổi thành Lông Vũ Gió.

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

## Triển khai lên Render

1. Đăng nhập https://dashboard.render.com, chọn **New → Blueprint**.
2. Kết nối GitHub và chọn repo `h2t-shooting`. Render đọc file `render.yaml` và tạo 2 thứ:
   - Web service `h2t-shooting` (Node.js).
   - Cơ sở dữ liệu PostgreSQL `h2t-db`, tự nối vào web service qua biến `DATABASE_URL`.
3. Render hỏi giá trị `ADMIN_USERNAMES`. Điền tên đăng nhập bạn sẽ dùng, ví dụ `tam`. Có thể điền nhiều tên, cách nhau bằng dấu phẩy.
4. Bấm **Apply**, đợi build xong, mở đường dẫn dạng `https://h2t-shooting.onrender.com`.
5. Đăng ký tài khoản đúng tên đã điền ở bước 3. Tab **Admin** sẽ hiện ra.

Mỗi lần bạn `git push` lên nhánh main, Render tự build lại.

### Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL. Blueprint tự điền. |
| `SESSION_SECRET` | Khóa ký phiên đăng nhập. Blueprint tự sinh ngẫu nhiên. |
| `ADMIN_USERNAMES` | Tên đăng nhập có quyền admin, cách nhau bằng dấu phẩy. Bỏ trống thì tài khoản đăng ký **đầu tiên** thành admin. |
| `PORT` | Render tự đặt. |

### Lưu ý về gói miễn phí của Render

- Web service miễn phí **ngủ sau 15 phút** không có người vào. Lần mở tiếp theo mất khoảng 1 phút để khởi động.
- PostgreSQL miễn phí có **1 GB**, **hết hạn sau 30 ngày** kể từ khi tạo. Sau đó có 14 ngày để nâng lên gói trả phí, quá hạn thì Render xóa dữ liệu. Gói miễn phí không có sao lưu.
- Muốn giữ dữ liệu người chơi lâu dài, hãy nâng database lên gói trả phí trước khi hết 30 ngày.

## Admin

Trong tab **Admin**, admin có thể:

- Xem tổng số tài khoản, tạo tài khoản mới cho người chơi (tên, mật khẩu, quyền).
- Tìm người chơi theo tên.
- Cộng vàng, tạo nguyên liệu (Đá cường hóa, các loại Tinh Thạch, Bùa may mắn, Bùa bảo hộ).
- Tạo trang bị theo ô, bậc và level.
- Đặt lại hồ sơ của một người chơi.
- Cấp hoặc bỏ quyền admin cho người khác.

Mọi lần admin tặng đồ đều được ghi vào log của server trên Render.

## Chống gian lận

- Tỉ lệ nâng cấp, phần thưởng và quà admin đều do **server** tính, trình duyệt không sửa được.
- Mật khẩu được băm bằng scrypt. Đăng nhập và đăng ký bị giới hạn số lần thử.
- Trận đấu mô phỏng trên trình duyệt, nên server chỉ kiểm tra được ở mức cơ bản: mỗi trận chỉ nhận thưởng một lần, và trận thắng ngắn hơn 15 giây không được tính. Muốn chống gian lận hoàn toàn thì cần chuyển phần mô phỏng trận đấu lên server.

## Không có máy chủ

Mở `public/index.html` trực tiếp (hoặc qua bất kỳ web tĩnh nào) thì game chạy ở chế độ chơi thử, lưu dữ liệu trên trình duyệt, tab Admin tác động lên chính hồ sơ của bạn.
