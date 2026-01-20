// Menangani fungsi di Panel Owner: Ban IP, Post Owner, & Manage Seller
async function banUser(ip) {
    await db.collection("banned_ips").doc(ip).set({ bannedAt: new Date() });
}
