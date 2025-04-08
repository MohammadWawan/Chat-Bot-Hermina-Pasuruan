const wppconnect = require("@wppconnect-team/wppconnect");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Setup database
const db = new sqlite3.Database(path.join(__dirname, "user_responses.db"));

// Buat tabel kalau belum ada
db.run(`
  CREATE TABLE IF NOT EXISTS responses (
    number TEXT PRIMARY KEY,
    last_response INTEGER
  )
`);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function start(client) {
  client.onMessage(async (message) => {
    if (!message.isGroupMsg && !message.fromMe) {
      const msgBody = message.body.trim();
      const userNumber = message.from;
      const now = Date.now();
      const allowedMenus = ["1", "2", "3"];

      db.get(
        "SELECT last_response FROM responses WHERE number = ?",
        [userNumber],
        async (err, row) => {
          if (err) {
            console.error("Database error:", err);
            return;
          }

          const lastTime = row ? row.last_response : 0;
          const isRecent = now - lastTime < ONE_DAY_MS;

          // Jika user sudah pernah dapat respon dan bukan pilih 1/2/3, maka tidak respon
          if (isRecent && !allowedMenus.includes(msgBody)) {
            console.log(
              `User ${userNumber} sudah pernah diberi respon hari ini. Tidak merespon.`
            );
            return;
          }

          // Update atau simpan waktu respon
          db.run(
            `
          INSERT INTO responses (number, last_response) VALUES (?, ?)
          ON CONFLICT(number) DO UPDATE SET last_response = excluded.last_response
        `,
            [userNumber, now]
          );

          // Handle menu
          if (msgBody === "1") {
            const firstReply = `Silahkan download, registrasi, dan buat janji pada aplikasi halo hermina:
https://play.google.com/store/apps/details?id=com.megahmuliamandiritama.bluespider.hermina&pcampaignid=web_share`;

            const secondReply = `Atau datang langsung ke RS Hermina Pasuruan:
https://g.co/kgs/6pftZJe`;

            const followUpReply = `Petugas kami akan membalas pesan anda, mohon kesediaannya untuk menunggu. Terimakasih`;

            try {
              await client.sendText(userNumber, firstReply);

              setTimeout(() => {
                client.sendText(userNumber, secondReply);

                setTimeout(() => {
                  client.sendText(userNumber, followUpReply);
                }, 300000); // 5 menit
              }, 1500); // 1.5 detik
            } catch (err) {
              console.error("Gagal dalam rangkaian pesan angka 1: ", err);
            }
          } else if (msgBody === "2") {
            const reply = `Berikut jadwal dokter RS Hermina Pasuruan:
https://online.fliphtml5.com/rwkoeo/vsyg/`;

            try {
              await client.sendText(userNumber, reply);
            } catch (err) {
              console.error("Gagal mengirim jadwal dokter: ", err);
            }
          } else if (msgBody === "3") {
            const reply = `Petugas kami akan membalas pesan anda, mohon kesediaannya untuk menunggu. Terimakasih`;

            try {
              await client.sendText(userNumber, reply);
            } catch (err) {
              console.error("Gagal mengirim pesan ke user: ", err);
            }
          } else {
            const welcomeMessage = `Selamat datang di chat bot Hermina Pasuruan 👋
          
Ketik angka 1 : untuk Pendaftaran 📝
Ketik angka 2 : untuk Info Jadwal Dokter 🧑‍⚕
Ketik angka 3 : untuk Chat dengan Petugas Kami 💬`;

            const imagePath = "./assets/gambar RS.jpg"; // path lokal
            try {
              // Baca dan tambahkan prefix agar jadi valid base64 image
              const imageBase64 = fs.readFileSync(imagePath, {
                encoding: "base64",
              });
              const fullBase64 = `data:image/jpeg;base64,${imageBase64}`; // pastikan "jpeg" sesuai ekstensi gambarmu

              // Kirim gambar dari base64
              await client.sendImageFromBase64(
                userNumber,
                fullBase64,
                "welcome.jpg",
                ""
              );

              // Delay lalu kirim teks sambutan
              setTimeout(() => {
                client.sendText(userNumber, welcomeMessage);
              }, 1000);
            } catch (err) {
              console.error("Gagal mengirim gambar atau pesan sambutan: ", err);
            }
          }
        }
      );
    }
  });
}

wppconnect.create().then((client) => start(client));
