// Centralized Receipt Printer Utility
import { invoke } from "@tauri-apps/api/core";
import { currencyFormatter } from "./currency";
import { toast } from "sonner";

interface SaleItem {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_amount?: number;
}

interface SaleData {
  sale_number: string;
  created_at: string;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  items: SaleItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  amount_received?: number;
  change?: number;
  notes?: string;
}

interface StoreConfig {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
}

/**
 * Formats a date string to local time
 * Fixes the timezone issue where UTC timestamps are displayed incorrectly
 */
function formatLocalDateTime(dateString: string): string {
  try {
    // If the string doesn't have timezone info, treat it as UTC
    const date = new Date(dateString + 'Z'); // Add 'Z' to indicate UTC
    return date.toLocaleString();
  } catch (error) {
    return new Date(dateString).toLocaleString();
  }
}

/**
 * Generates receipt HTML for printing
 */
function generateReceiptHTML(saleData: SaleData, storeConfig: StoreConfig | null): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${saleData.sale_number}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0 auto;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
          }
          .header p {
            margin: 2px 0;
            font-size: 10px;
          }
          .info {
            margin-bottom: 10px;
            font-size: 11px;
          }
          .items {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            margin: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .totals {
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .grand-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            border-top: 2px dashed #000;
            padding-top: 10px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${storeConfig?.name || 'Premium POS'}</h1>
          ${storeConfig ? `
            ${storeConfig.address ? `<p>${storeConfig.address}</p>` : ''}
            ${storeConfig.city && storeConfig.state && storeConfig.zip_code ? 
              `<p>${storeConfig.city}, ${storeConfig.state} ${storeConfig.zip_code}</p>` : ''}
            ${storeConfig.phone ? `<p>Tel: ${storeConfig.phone}</p>` : ''}
            ${storeConfig.email ? `<p>${storeConfig.email}</p>` : ''}
          ` : ''}
        </div>
        
        <div class="info">
          <p><strong>Receipt #:</strong> ${saleData.sale_number}</p>
          <p><strong>Date:</strong> ${formatLocalDateTime(saleData.created_at)}</p>
          ${saleData.cashier_name ? `<p><strong>Cashier:</strong> ${saleData.cashier_name}</p>` : ''}
          ${saleData.customer_name ? `<p><strong>Customer:</strong> ${saleData.customer_name}</p>` : ''}
        </div>
        
        <div class="items">
          ${saleData.items.map((item: SaleItem) => `
            <div class="item">
              <span>${item.product_name || 'Product #' + item.product_id}</span>
            </div>
            <div class="item">
              <span>&nbsp;&nbsp;${item.quantity} x ${currencyFormatter.formatReceipt(item.unit_price)}</span>
              <span>${currencyFormatter.formatReceipt(item.line_total)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${currencyFormatter.formatReceipt(saleData.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>Tax:</span>
            <span>${currencyFormatter.formatReceipt(saleData.tax_amount)}</span>
          </div>
          ${saleData.discount_amount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${currencyFormatter.formatReceipt(saleData.discount_amount)}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>${currencyFormatter.formatReceipt(saleData.total_amount)}</span>
          </div>
        </div>
        
        <div class="info">
          <p><strong>Payment:</strong> ${saleData.payment_method.toUpperCase()}</p>
          ${saleData.amount_received ? `<p><strong>Received:</strong> ${currencyFormatter.formatReceipt(saleData.amount_received)}</p>` : ''}
          ${saleData.change && saleData.change > 0 ? `<p><strong>Change:</strong> ${currencyFormatter.formatReceipt(saleData.change)}</p>` : ''}
        </div>
        
        ${saleData.notes ? `
          <div class="info">
            <p><strong>Notes:</strong> ${saleData.notes}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p><strong>Thank you for your purchase!</strong></p>
          <p>Please keep this receipt for your records</p>
          <p style="font-size: 9px;">Powered by Premium POS System</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Prints a receipt using the centralized template
 * @param saleData - The sale data to print
 * @returns Promise<boolean> - Success status
 */
export async function printReceipt(saleData: SaleData): Promise<boolean> {
  try {
    // Load store config
    const storeConfig = await invoke<StoreConfig>("get_store_config").catch(() => null);

    // Create hidden iframe for printing
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error("❌ Failed to create print frame");
      document.body.removeChild(iframe);
      return false;
    }

    // Generate and write receipt HTML
    const receiptHTML = generateReceiptHTML(saleData, storeConfig);
    iframeDoc.open();
    iframeDoc.write(receiptHTML);
    iframeDoc.close();

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Print
    iframe.contentWindow?.print();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);

    toast.success("🖨️ Receipt sent to printer");
    return true;
  } catch (error) {
    console.error("Failed to print receipt:", error);
    toast.error(`❌ Failed to print receipt: ${error}`);
    return false;
  }
}

/**
 * Export the formatLocalDateTime function for use in other components
 */
export { formatLocalDateTime };
