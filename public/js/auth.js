// Menangani login Firebase & Pengecekan Banned IP
async function checkIP() {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    // Kirim IP ke server untuk verifikasi
}
