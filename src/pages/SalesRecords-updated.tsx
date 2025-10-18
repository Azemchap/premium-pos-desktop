// This file contains the updated printSaleReceipt function
// Copy this function into SalesRecords.tsx to replace the old one

const printSaleReceipt = async () => {
  if (!selectedSale || saleItems.length === 0) {
    toast.error("❌ No sale data available");
    return;
  }

  try {
    // Prepare sale data for the centralized receipt printer
    const saleDataForPrint = {
      sale_number: selectedSale.sale_number,
      created_at: selectedSale.created_at,
      cashier_name: selectedSaleDetails?.cashier_name,
      customer_name: selectedSale.customer_name,
      customer_phone: selectedSale.customer_phone,
      items: saleItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product?.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        tax_amount: item.tax_amount,
      })),
      subtotal: selectedSale.subtotal,
      tax_amount: selectedSale.tax_amount,
      discount_amount: selectedSale.discount_amount,
      total_amount: selectedSale.total_amount,
      payment_method: selectedSale.payment_method,
      notes: selectedSale.notes,
    };

    // Use centralized receipt printer
    await printReceipt(saleDataForPrint);
  } catch (error) {
    console.error("Failed to print receipt:", error);
    toast.error("❌ Failed to print receipt");
  }
};
