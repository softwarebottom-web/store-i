// Menangani tampilan produk secara realtime dan sistem Add to Cart
function loadProducts() {
    db.collection("products").onSnapshot(snap => {
        // Render cards ke index.html
    });
}
