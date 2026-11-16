import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Offline placeholder "clue" image for Đuổi hình bắt chữ seed data — a big
// emoji on a flat lime card, so the demo works with zero external assets.
function emojiClueImage(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <rect width="400" height="300" fill="#E3EA78"/>
    <text x="200" y="175" font-size="120" text-anchor="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.adminAccount.upsert({
    where: { username: adminUsername },
    update: {},
    create: { username: adminUsername, passwordHash },
  });
  console.log(`Admin account ready: ${adminUsername} / ${adminPassword}`);

  const departments = [
    { code: "01", name: "P. Kinh doanh Sỉ", sortOrder: 1 },
    { code: "02", name: "P. Kinh doanh Lẻ", sortOrder: 2 },
    { code: "03", name: "P. Kế toán – Nhân sự", sortOrder: 3 },
    { code: "04", name: "P. Phát triển Sản phẩm & Media", sortOrder: 4 },
    { code: "05", name: "P. Kế hoạch & Vận hành Sản xuất", sortOrder: 5 },
    { code: "06", name: "Sản xuất (gồm Tổ Sáp, Tổ Đúc, Tổ Nguội, Tổ Khắc Cưa – Xi mạ)", sortOrder: 6 },
    { code: "07", name: "P. QC – Đóng gói", sortOrder: 7 },
    { code: "08", name: "P. Kho", sortOrder: 8 },
  ];
  const departmentIds = new Map<string, string>();
  for (const department of departments) {
    const record = await prisma.department.upsert({
      where: { code: department.code },
      update: {},
      create: department,
    });
    departmentIds.set(department.code, record.id);
  }

  const employees = [
    { employeeCode: "NV0001", fullName: "Nguyễn Văn An", departmentCode: "01" },
    { employeeCode: "NV0002", fullName: "Trần Thị Bình", departmentCode: "04" },
    { employeeCode: "NV0003", fullName: "Lê Hoàng Cường", departmentCode: "06" },
    { employeeCode: "NV0004", fullName: "Phạm Thị Dung", departmentCode: "03" },
    { employeeCode: "NV0005", fullName: "Hoàng Văn Em", departmentCode: "08" },
  ];
  for (const e of employees) {
    await prisma.employee.upsert({
      where: { employeeCode: e.employeeCode },
      update: {},
      create: {
        employeeCode: e.employeeCode,
        fullName: e.fullName,
        departmentId: departmentIds.get(e.departmentCode),
        status: "ACTIVE",
      },
    });
  }
  console.log(`Seeded ${employees.length} employees.`);

  const existingGame = await prisma.game.findUnique({ where: { slug: "kien-thuc-paina" } });
  if (!existingGame) {
    const game = await prisma.game.create({
      data: {
        slug: "kien-thuc-paina",
        title: "Kiến thức PAINA",
        description: "Trắc nghiệm nhanh kiểm tra hiểu biết về công ty.",
        type: "QUIZ",
        instructions: "Trả lời 5 câu hỏi trong 120 giây. Mỗi câu đúng được 10 điểm, trả lời nhanh có thêm điểm thưởng.",
        status: "ACTIVE",
        durationSeconds: 120,
        maxPlaysPerUser: 1,
        pointsPerQuestion: 10,
        speedBonusMax: 20,
        hintPenalty: 3,
        questions: {
          create: [
            {
              order: 1,
              prompt: "PAINA GAME HUB dùng để làm gì?",
              choicesJson: JSON.stringify([
                "Chơi mini game nội bộ công ty",
                "Quản lý lương",
                "Đặt lịch họp",
                "Theo dõi KPI",
              ]),
              correctJson: JSON.stringify(0),
              hint: "Chữ 'Game' trong tên đã gợi ý câu trả lời.",
            },
            {
              order: 2,
              prompt: "Ai có quyền tạo game mới trên hệ thống?",
              choicesJson: JSON.stringify(["Bất kỳ nhân viên nào", "Chỉ Admin", "Trưởng phòng", "Không ai"]),
              correctJson: JSON.stringify(1),
            },
            {
              order: 3,
              prompt: "Mỗi nhân viên được chơi một game bao nhiêu lần theo mặc định?",
              choicesJson: JSON.stringify(["1 lần", "3 lần", "Không giới hạn", "5 lần"]),
              correctJson: JSON.stringify(0),
            },
            {
              order: 4,
              prompt: "Bảng xếp hạng hiển thị thông tin nào của bạn?",
              choicesJson: JSON.stringify([
                "Mã nhân viên và email",
                "Họ tên, phòng ban, điểm và thứ hạng",
                "Số điện thoại",
                "Mật khẩu",
              ]),
              correctJson: JSON.stringify(1),
              hint: "Hệ thống không công khai thông tin đăng nhập.",
            },
            {
              order: 5,
              prompt: "Điểm số của bạn được tính ở đâu?",
              choicesJson: JSON.stringify(["Trên trình duyệt của bạn", "Trên máy chủ (backend)", "Không ai tính", "Do bạn tự nhập"]),
              correctJson: JSON.stringify(1),
            },
          ],
        },
      },
    });
    console.log(`Seeded sample game: ${game.title}`);
  }

  const trueFalseExisting = await prisma.game.findUnique({ where: { slug: "dung-hay-sai" } });
  if (!trueFalseExisting) {
    const game = await prisma.game.create({
      data: {
        slug: "dung-hay-sai",
        title: "Đúng hay Sai?",
        description: "Trả lời nhanh các phát biểu Đúng/Sai về PAINA GAME HUB.",
        type: "TRUE_FALSE",
        instructions: "Đọc kỹ từng câu và chọn Đúng hoặc Sai. 4 câu, 60 giây.",
        status: "ACTIVE",
        durationSeconds: 60,
        maxPlaysPerUser: 1,
        pointsPerQuestion: 10,
        speedBonusMax: 10,
        questions: {
          create: [
            {
              order: 1,
              prompt: "Nhân sự có thể tự nâng cấp tài khoản của mình thành Admin.",
              choicesJson: JSON.stringify(["Đúng", "Sai"]),
              correctJson: JSON.stringify(1),
            },
            {
              order: 2,
              prompt: "Mỗi game có thể giới hạn số lượt chơi tối đa cho mỗi người.",
              choicesJson: JSON.stringify(["Đúng", "Sai"]),
              correctJson: JSON.stringify(0),
            },
            {
              order: 3,
              prompt: "Đáp án đúng được gửi về trình duyệt trước khi bạn trả lời.",
              choicesJson: JSON.stringify(["Đúng", "Sai"]),
              correctJson: JSON.stringify(1),
              hint: "Nếu vậy thì ai cũng gian lận được.",
            },
            {
              order: 4,
              prompt: "Bảng xếp hạng có thể lọc theo phòng ban.",
              choicesJson: JSON.stringify(["Đúng", "Sai"]),
              correctJson: JSON.stringify(0),
            },
          ],
        },
      },
    });
    console.log(`Seeded sample game: ${game.title}`);
  }

  const pictureExisting = await prisma.game.findUnique({ where: { slug: "duoi-hinh-bat-chu" } });
  if (!pictureExisting) {
    const game = await prisma.game.create({
      data: {
        slug: "duoi-hinh-bat-chu",
        title: "Đuổi hình bắt chữ",
        description: "Nhìn hình đoán từ — gõ đáp án của bạn.",
        type: "PICTURE_GUESSING",
        instructions: "Xem ảnh gợi ý và gõ từ bạn nghĩ là đáp án. Không phân biệt hoa/thường hay dấu.",
        status: "ACTIVE",
        durationSeconds: 90,
        maxPlaysPerUser: 1,
        pointsPerQuestion: 15,
        hintPenalty: 5,
        questions: {
          create: [
            {
              order: 1,
              prompt: "Đây là từ/cụm từ gì?",
              imageUrl: emojiClueImage("🍍"),
              choicesJson: JSON.stringify([]),
              correctJson: JSON.stringify("quả dứa"),
              hint: "Biểu tượng của PAINA.",
            },
            {
              order: 2,
              prompt: "Đây là từ/cụm từ gì?",
              imageUrl: emojiClueImage("🏆"),
              choicesJson: JSON.stringify([]),
              correctJson: JSON.stringify("chiến thắng"),
            },
            {
              order: 3,
              prompt: "Đây là từ/cụm từ gì?",
              imageUrl: emojiClueImage("💎"),
              choicesJson: JSON.stringify([]),
              correctJson: JSON.stringify("kim cương"),
            },
          ],
        },
      },
    });
    console.log(`Seeded sample game: ${game.title}`);
  }

  const wordPuzzleExisting = await prisma.game.findUnique({ where: { slug: "sap-xep-tu" } });
  if (!wordPuzzleExisting) {
    const game = await prisma.game.create({
      data: {
        slug: "sap-xep-tu",
        title: "Sắp xếp từ",
        description: "Chạm các từ đang xáo trộn theo đúng thứ tự để tạo thành câu đúng.",
        type: "WORD_PUZZLE",
        instructions: "Mỗi câu gồm vài từ bị xáo trộn. Chạm từng từ theo đúng thứ tự để ghép thành câu đúng.",
        status: "ACTIVE",
        durationSeconds: 90,
        maxPlaysPerUser: 1,
        pointsPerQuestion: 20,
        questions: {
          create: [
            {
              order: 1,
              prompt: "Sắp xếp thành câu đúng",
              choicesJson: JSON.stringify([]),
              correctJson: JSON.stringify(["chất", "lượng", "tạo", "nên", "thương", "hiệu"]),
            },
            {
              order: 2,
              prompt: "Sắp xếp thành câu đúng",
              choicesJson: JSON.stringify([]),
              correctJson: JSON.stringify(["đoàn", "kết", "là", "sức", "mạnh"]),
            },
          ],
        },
      },
    });
    console.log(`Seeded sample game: ${game.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
