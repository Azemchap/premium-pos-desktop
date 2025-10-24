// src/components/ReceiptTemplate.tsx
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { currencyFormatter } from "@/lib/currency";

interface ReceiptProps {
  saleNumber: string;
  date: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    line_total: number;
    product_name?: string;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
}

interface StoreConfig {
  store_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  email: string;
  tax_id: string;
}

export default function ReceiptTemplate({
  saleNumber,
  date,
  items,
  subtotal,
  tax,
  discount,
  total,
  paymentMethod,
  amountReceived,
  change,
  customerName,
  customerPhone,
  cashierName,
}: ReceiptProps) {
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [productsMap, setProductsMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load store config
        const config = await invoke<StoreConfig>("get_store_config");
        setStoreConfig(config);

        // Load product names for items
        // const productIds = items.map(item => item.product_id);
        const products = await invoke<any[]>("get_products");
        const map: Record<number, string> = {};
        products.forEach(p => {
          map[p.id] = p.name;
        });
        setProductsMap(map);
      } catch (error) {
        console.error("Failed to load receipt data:", error);
      }
    };
    loadData();
  }, [items]);

  return (
    <div className="receipt-container bg-white text-black p-8 max-w-[80mm] mx-auto font-mono text-sm">
      {/* Store Header */}
      <div className="text-center mb-6 border-b-2 border-dashed border-black pb-4">
        <h1 className="text-xl font-bold mb-2">
          {storeConfig?.store_name || "ZTAD POS"}
        </h1>
        {storeConfig && (
          <>
            <p className="text-xs">{storeConfig.address}</p>
            <p className="text-xs">
              {storeConfig.city}, {storeConfig.state} {storeConfig.zip_code}
            </p>
            <p className="text-xs">Tel: {storeConfig.phone}</p>
            {storeConfig.email && <p className="text-xs">{storeConfig.email}</p>}
            {storeConfig.tax_id && <p className="text-xs">Tax ID: {storeConfig.tax_id}</p>}
          </>
        )}
      </div>

      {/* Sale Info */}
      <div className="mb-4 text-xs">
        <div className="flex justify-between">
          <span>Receipt #:</span>
          <span className="font-bold">{saleNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{format(new Date(date), "MMM dd, yyyy hh:mm a")}</span>
        </div>
        {cashierName && (
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{cashierName}</span>
          </div>
        )}
      </div>

      {/* Customer Info */}
      {(customerName || customerPhone) && (
        <div className="mb-4 text-xs border-b border-dashed border-black pb-2">
          {customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{customerName}</span>
            </div>
          )}
          {customerPhone && (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{customerPhone}</span>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="mb-4 border-b-2 border-dashed border-black pb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left pb-2">Item</th>
              <th className="text-center pb-2">Qty</th>
              <th className="text-right pb-2">Price</th>
              <th className="text-right pb-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-dotted border-gray-400">
                <td className="py-2 pr-2">
                  {productsMap[item.product_id] || `Product #${item.product_id}`}
                </td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{currencyFormatter.format(item.unit_price)}</td>
                <td className="text-right font-medium">{currencyFormatter.format(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mb-6 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currencyFormatter.format(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-{currencyFormatter.format(discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>{currencyFormatter.format(tax)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t-2 border-black pt-2 mt-2">
          <span>TOTAL:</span>
          <span>{currencyFormatter.format(total)}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="mb-6 text-xs border-t border-dashed border-black pt-2">
        <div className="flex justify-between font-medium">
          <span>Payment Method:</span>
          <span className="uppercase">{paymentMethod}</span>
        </div>
        {amountReceived !== undefined && (
          <>
            <div className="flex justify-between">
              <span>Amount Received:</span>
              <span>{currencyFormatter.format(amountReceived)}</span>
            </div>
            {change !== undefined && change > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>{currencyFormatter.format(change)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs border-t-2 border-dashed border-black pt-4">
        <p className="font-bold mb-2">Thank you for your purchase!</p>
        <p className="mb-1">Please keep this receipt for your records</p>
        <p className="text-[10px] text-gray-600">
          Powered by ZTAD POS System
        </p>
      </div>

      {/* Barcode placeholder */}
      <div className="text-center mt-4">
        <div className="inline-block border border-black px-2 py-1">
          <p className="text-[10px] font-mono">{saleNumber}</p>
        </div>
      </div>
    </div>
  );
}
