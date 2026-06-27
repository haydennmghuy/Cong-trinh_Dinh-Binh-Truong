var MAP_DATA = {
  areas: [
    {
      id: "cong-tam-quan",
      x: 50, y: 72,
      color: "#C9A84C",
      vi: {
        name: "Cổng Tam Quan",
        short: "Cổng chính",
        desc: "Cổng Tam Quan là lối vào chính của đình, mang kiến trúc ba ô cửa đặc trưng của đình chùa Nam Bộ. Hai trụ cột lớn chạm khắc câu đối chữ Hán ca ngợi công đức Thành Hoàng. Mái ngói âm dương uốn cong thanh thoát, trang trí hình lưỡng long chầu nhật trên bờ nóc.",
        audio: "audio/vi/cong-tam-quan.mp3"
      },
      en: {
        name: "Main Triple Gate",
        short: "Main entrance",
        desc: "The Triple Gate (Tam Quan) serves as the main entrance to the communal house, featuring three characteristic arched doorways typical of Southern Vietnamese temple architecture. Two large pillars are carved with Chinese couplets praising the Guardian Spirit's virtues. The yin-yang roof tiles curve gracefully, decorated with twin dragon motifs on the ridge.",
        audio: "audio/en/main-gate.mp3"
      }
    },
    {
      id: "san-dinh",
      x: 50, y: 55,
      color: "#8B9E6C",
      vi: {
        name: "Sân Đình",
        short: "Sân trước",
        desc: "Sân đình rộng rãi lát gạch đỏ truyền thống, là không gian tụ họp của cộng đồng trong các dịp lễ hội. Hai bên sân có cây cổ thụ che bóng mát. Vào dịp Lễ Kỳ Yên, sân đình là nơi diễn ra múa lân, hát bội và các trò chơi dân gian.",
        audio: "audio/vi/san-dinh.mp3"
      },
      en: {
        name: "Temple Courtyard",
        short: "Front courtyard",
        desc: "The spacious courtyard is paved with traditional red bricks and serves as the community gathering space during festivals. Ancient trees provide shade on both sides. During the Ky Yen Festival, the courtyard hosts lion dances, traditional opera, and folk games.",
        audio: "audio/en/courtyard.mp3"
      }
    },
    {
      id: "tien-dien",
      x: 50, y: 40,
      color: "#B85C4C",
      vi: {
        name: "Tiền Điện",
        short: "Nhà tiền",
        desc: "Tiền Điện là gian nhà phía trước, nơi đặt bàn thờ Môn Thần (thần cửa) và các vị thần hộ vệ. Kiến trúc sử dụng hệ thống cột kèo gỗ theo lối 'tứ trụ' điển hình, với các họa tiết chạm khắc tinh xảo về tứ linh: long, lân, quy, phụng.",
        audio: "audio/vi/tien-dien.mp3"
      },
      en: {
        name: "Front Hall",
        short: "Entrance hall",
        desc: "The Front Hall houses altars for the Door God (Mon Than) and protective deities. The architecture uses a traditional 'four-pillar' wooden beam system, with intricate carvings of the four sacred animals: dragon, unicorn, tortoise, and phoenix.",
        audio: "audio/en/front-hall.mp3"
      }
    },
    {
      id: "chanh-dien",
      x: 50, y: 28,
      color: "#C9A84C",
      vi: {
        name: "Chánh Điện",
        short: "Điện thờ chính",
        desc: "Chánh Điện là trung tâm linh thiêng nhất của đình, nơi thờ Thành Hoàng Bổn Cảnh — vị thần bảo hộ cộng đồng. Bàn thờ chính được sơn son thếp vàng lộng lẫy, với bức hoành phi và câu đối chạm khắc tinh tế. Năm 1852, vua Tự Đức ban sắc phong Thần Thành Hoàng cho đình.",
        audio: "audio/vi/chanh-dien.mp3"
      },
      en: {
        name: "Main Shrine Hall",
        short: "Main altar",
        desc: "The Main Shrine Hall is the most sacred space, housing the Guardian Spirit (Thanh Hoang) altar — the community's protective deity. The main altar is elaborately lacquered in red and gold, with finely carved horizontal boards and couplets. In 1852, Emperor Tu Duc granted an official seal recognizing the Guardian Spirit.",
        audio: "audio/en/main-shrine.mp3"
      }
    },
    {
      id: "hau-dien",
      x: 50, y: 16,
      color: "#6B8CAE",
      vi: {
        name: "Hậu Điện",
        short: "Nhà hậu",
        desc: "Hậu Điện nằm phía sau cùng, thờ các vị thần phụ và tổ tiên của làng. Không gian yên tĩnh, trang nghiêm với các tấm hoành phi ghi chép công đức của các bậc tiền nhân đã đóng góp xây dựng đình.",
        audio: "audio/vi/hau-dien.mp3"
      },
      en: {
        name: "Rear Hall",
        short: "Back shrine",
        desc: "The Rear Hall at the back of the complex houses secondary deities and village ancestors. The quiet, solemn space features horizontal boards recording the contributions of community members who helped build and maintain the temple.",
        audio: "audio/en/rear-hall.mp3"
      }
    },
    {
      id: "nha-vo-ca",
      x: 20, y: 40,
      color: "#9B7BAE",
      vi: {
        name: "Nhà Võ Ca",
        short: "Sân khấu hát bội",
        desc: "Nhà Võ Ca là sân khấu biểu diễn hát bội (tuồng) truyền thống trong các dịp lễ hội. Kiến trúc mở ba phía, mái cao rộng để âm thanh vang xa. Đây là nơi gìn giữ nghệ thuật hát bội — loại hình sân khấu cổ điển đặc trưng của miền Nam Việt Nam.",
        audio: "audio/vi/nha-vo-ca.mp3"
      },
      en: {
        name: "Opera Stage",
        short: "Traditional stage",
        desc: "The Opera Stage is the performance area for traditional 'hat boi' (classical opera) during festivals. The open-sided structure with a high, wide roof allows sound to carry. This space preserves hat boi — the classical theatrical art form characteristic of Southern Vietnam.",
        audio: "audio/en/opera-stage.mp3"
      }
    },
    {
      id: "cot-keo-go",
      x: 80, y: 40,
      color: "#8B6914",
      vi: {
        name: "Hệ Thống Cột Kèo Gỗ",
        short: "Kết cấu gỗ",
        desc: "Hệ thống cột kèo gỗ là tinh hoa kiến trúc của đình, được làm từ gỗ căm xe và gỗ lim quý hiếm. Các đầu kèo chạm khắc hình rồng, phụng và các hoa văn truyền thống. Kỹ thuật mộng tenon & mortise truyền thống không dùng đinh, thể hiện tài năng của nghệ nhân xưa.",
        audio: "audio/vi/cot-keo-go.mp3"
      },
      en: {
        name: "Wooden Column System",
        short: "Structural woodwork",
        desc: "The wooden column and beam system is the architectural highlight of the temple, crafted from rare cam xe and ironwood. Beam ends are carved with dragons, phoenixes, and traditional motifs. The traditional tenon-and-mortise joinery uses no nails, demonstrating the mastery of ancient craftsmen.",
        audio: "audio/en/wooden-columns.mp3"
      }
    },
    {
      id: "bo-noc-mai-ngoi",
      x: 50, y: 6,
      color: "#C9A84C",
      vi: {
        name: "Bờ Nóc & Mái Ngói",
        short: "Mái đình",
        desc: "Bờ nóc đình được trang trí bằng các tượng gốm màu sắc sinh động mô tả các nhân vật trong tích tuồng và biểu tượng cát tường. Mái ngói âm dương truyền thống được làm thủ công, uốn cong nhẹ theo kiểu 'thượng thu hạ thách' — vừa thoát nước tốt vừa tạo nét duyên dáng đặc trưng.",
        audio: "audio/vi/bo-noc.mp3"
      },
      en: {
        name: "Roof Ridge & Tiles",
        short: "Decorative roofline",
        desc: "The roof ridge is adorned with vibrant ceramic figurines depicting scenes from traditional opera and auspicious symbols. Traditional handmade yin-yang tiles are gently curved in the 'upper gathering, lower expanding' style — providing excellent drainage while creating the temple's characteristic graceful silhouette.",
        audio: "audio/en/roof-ridge.mp3"
      }
    }
  ],
  timeline: [
    { year: "~1808", vi: "Xây dựng Đình Bình Trường", en: "Binh Truong Communal House is established" },
    { year: "1818", vi: "Ghi nhận trong Gia Định Thành Thông Chí của Trịnh Hoài Đức", en: "Documented in Gia Dinh Thanh Thong Chi by Trinh Hoai Duc" },
    { year: "1852", vi: "Vua Tự Đức ban sắc phong Thần Thành Hoàng Bổn Cảnh", en: "Emperor Tu Duc grants an official seal to the Guardian Spirit" },
    { year: "1945–1954", vi: "Đình là 'hộp thư bí mật' của kháng chiến chống Pháp", en: "Temple serves as a secret communication post in the anti-French resistance" },
    { year: "1955–1975", vi: "Tiếp tục vai trò liên lạc bí mật chống Mỹ", en: "Continues role as a secret liaison point in the anti-American resistance" },
    { year: "2005", vi: "Xếp hạng Di tích Kiến trúc Nghệ thuật cấp TP.HCM", en: "Classified as Ho Chi Minh City-level Architectural and Artistic Heritage Site" }
  ]
};
