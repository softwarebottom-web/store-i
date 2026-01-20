// Menangani pembuatan tiket via API server.js
async function createTicket(orderData) {
    const response = await fetch('/api/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    return response.json();
}
