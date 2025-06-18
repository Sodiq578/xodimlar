// Xodimlar ro'yxati
const employees = [
    { id: "001", name: "Ali Xolmatov" },
    { id: "002", name: "Vali Saidov" },
    { id: "003", name: "Nodira Axmedova" },
    { id: "004", name: "Shaxzod Raximov" },
    { id: "005", name: "Gulnoza Karimova" },
    { id: "006", name: "Bekzod Tursunov" },
    { id: "007", name: "Dildora Yuldasheva" },
    { id: "008", name: "Jamshid Ergashev" },
    { id: "009", name: "Malika Sobirova" },
    { id: "010", name: "Otabek Murodov" }
];

// Admin paroli
const ADMIN_PASSWORD = 'sodiq19';

// QR kod skanerlash
function startQRScanner() {
    const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 200 }, false);
    
    html5QrcodeScanner.render(
        (decodedText) => {
            const employee = employees.find(emp => emp.id === decodedText);
            if (employee) {
                const now = new Date();
                const time = now.toLocaleString('uz-UZ', { hour12: false });
                
                // Ma'lumotlarni localStorage'ga saqlash
                let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
                const existingRecord = attendanceRecords.find(record => 
                    record.id === employee.id && 
                    record.time.startsWith(now.toLocaleDateString('uz-UZ'))
                );
                
                if (existingRecord) {
                    existingRecord.time = time;
                } else {
                    attendanceRecords.push({
                        id: employee.id,
                        name: employee.name,
                        time: time
                    });
                }

                localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
                document.getElementById('qr-reader-results').textContent = 
                    `ID: ${employee.id} (${employee.name}) kirish vaqti: ${time}`;
                updateAttendanceList();
            } else {
                document.getElementById('qr-reader-results').textContent = 
                    'Nomalum QR kod. Iltimos, togri kodni skanerlang.';
            }
        },
        (error) => {
            console.warn(`QR kod skanerlashda xatolik: ${error}`);
        }
    );
}

// Kelgan vaqtlar ro'yxatini yangilash
function updateAttendanceList() {
    const attendanceList = document.getElementById('attendance-list');
    attendanceList.innerHTML = '';

    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    attendanceRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.name}</td>
            <td>${record.time}</td>
        `;
        attendanceList.appendChild(row);
    });
}

// QR kodlarni generatsiya qilish
function generateQRCodes() {
    const qrCodesGrid = document.getElementById('qr-codes-grid');
    qrCodesGrid.innerHTML = '';

    employees.forEach(employee => {
        const qrCodeItem = document.createElement('div');
        qrCodeItem.classList.add('qr-code-item');

        const qrCodeDiv = document.createElement('div');
        new QRCode(qrCodeDiv, {
            text: employee.id,
            width: 100,
            height: 100
        });

        // Faqat ID ko'rsatiladi
        const qrCodeId = document.createElement('p');
        qrCodeId.textContent = `ID: ${employee.id}`;

        qrCodeItem.appendChild(qrCodeDiv);
        qrCodeItem.appendChild(qrCodeId);
        qrCodesGrid.appendChild(qrCodeItem);
    });
}

// Barcha QR kodlarni ZIP sifatida yuklab olish
function downloadAllQRCodes() {
    const zip = new JSZip();
    const qrPromises = employees.map(employee => {
        const qrCodeDiv = document.createElement('div');
        return new Promise(resolve => {
            new QRCode(qrCodeDiv, {
                text: employee.id,
                width: 100,
                height: 100,
                callback: () => {
                    const canvas = qrCodeDiv.querySelector('canvas');
                    canvas.toBlob(blob => {
                        zip.file(`QR_${employee.id}.png`, blob);
                        resolve();
                    });
                }
            });
        });
    });

    Promise.all(qrPromises).then(() => {
        zip.generateAsync({ type: 'blob' }).then(content => {
            saveAs(content, 'QR_Codes.zip');
        });
    });
}

// Telegram guruhiga ma'lumotlarni yuborish
async function sendToTelegram() {
    const botToken = '7769875593:AAHt-AV_x9mQ8475XX_wXC3YyDEZr77WiEU';
    const chatId = '-4829696325';
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];

    if (attendanceRecords.length === 0) {
        console.log('Yuborish uchun ma\'lumotlar yo\'q.');
        return;
    }

    let message = 'Xodimlar Kirish Vaqtlari:\n\n';
    attendanceRecords.forEach(record => {
        message += `ID: ${record.id}, Ism: ${record.name}, Vaqt: ${record.time}\n`;
    });

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message
            })
        });

        const result = await response.json();
        if (result.ok) {
            console.log('Ma\'lumotlar Telegram guruhiga yuborildi.');
        } else {
            console.error('Telegramga yuborishda xatolik:', result.description);
        }
    } catch (error) {
        console.error('Telegram API xatoligi:', error);
    }
}

// Admin parolini tekshirish
function checkAdminPassword() {
    const passwordInput = document.getElementById('admin-password').value;
    const loginForm = document.getElementById('login-form');
    const qrCodesSection = document.getElementById('qr-codes-section');

    if (passwordInput === ADMIN_PASSWORD) {
        loginForm.style.display = 'none';
        qrCodesSection.style.display = 'block';
        generateQRCodes();
    } else {
        alert('Noto\'g\'ri parol! Iltimos, qayta urinib ko\'ring.');
    }
}

// Sahifa yuklanganda ishga tushadi
document.addEventListener('DOMContentLoaded', () => {
    startQRScanner();
    updateAttendanceList();
    sendToTelegram(); // Birinchi marta yuborish
    setInterval(sendToTelegram, 5 * 60 * 1000); // Har 5 daqiqada yuborish

    // ZIP yuklab olish tugmasi
    document.getElementById('download-all-qr').addEventListener('click', downloadAllQRCodes);
});