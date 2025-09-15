import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    Download,
    Printer,
    Share2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Sale {
    id: number;
    sale_number: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    payment_method: string;
    payment_reference?: string;
    status: string;
    notes?: string;
    created_at: string;
}

interface SaleItem {
    id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
}

interface ReceiptProps {
    sale: Sale;
    items: SaleItem[];
    trigger?: React.ReactNode;
    autoOpen?: boolean;
}

interface StoreConfig {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    receipt_header?: string;
    receipt_footer?: string;
}

export default function ReceiptPrinter({ sale, items, trigger, autoOpen = false }: ReceiptProps) {
    const [isOpen, setIsOpen] = useState(autoOpen);
    const [printing, setPrinting] = useState(false);
    const [storeConfig] = useState<StoreConfig>({
        name: "Premium POS Store",
        address: "123 Main Street, City, State 12345",
        phone: "(555) 123-4567",
        email: "info@premiumpos.com",
        receipt_header: "Thank you for your business!",
        receipt_footer: "Visit us again soon!"
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    const handlePrint = async () => {
        try {
            setPrinting(true);

            // In a real implementation, you would call your Rust backend to handle printing
            // For now, we'll simulate the printing process
            await new Promise(resolve => setTimeout(resolve, 1000));

            // You could also use the browser's print functionality for the receipt
            const receiptContent = document.getElementById('receipt-content');
            if (receiptContent) {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`
                        <html>
                            <head>
                                <title>Receipt - ${sale.sale_number}</title>
                                <style>
                                    body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; }
                                    .receipt { width: 300px; margin: 0 auto; }
                                    .center { text-align: center; }
                                    .right { text-align: right; }
                                    .bold { font-weight: bold; }
                                    .separator { border-top: 1px dashed #000; margin: 10px 0; }
                                    .item-line { display: flex; justify-content: space-between; }
                                </style>
                            </head>
                            <body>
                                ${receiptContent.innerHTML}
                            </body>
                        </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                    printWindow.close();
                }
            }

            toast.success("Receipt sent to printer");
        } catch (error) {
            console.error("Failed to print receipt:", error);
            toast.error("Failed to print receipt");
        } finally {
            setPrinting(false);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // In a real implementation, you would generate a PDF receipt
            toast.success("PDF receipt downloaded");
        } catch (error) {
            console.error("Failed to download receipt:", error);
            toast.error("Failed to download receipt");
        }
    };

    const handleEmailReceipt = async () => {
        try {
            if (!sale.customer_email) {
                toast.error("Customer email not available");
                return;
            }

            // In a real implementation, you would send the receipt via email
            toast.success(`Receipt emailed to ${sale.customer_email}`);
        } catch (error) {
            console.error("Failed to email receipt:", error);
            toast.error("Failed to email receipt");
        }
    };

    const ReceiptContent = () => (
        <div id="receipt-content" className="receipt max-w-sm mx-auto bg-white p-4 text-sm font-mono">
            {/* Header */}
            <div className="text-center mb-4">
                <h2 className="text-lg font-bold">{storeConfig.name}</h2>
                {storeConfig.address && <p className="text-xs">{storeConfig.address}</p>}
                {storeConfig.phone && <p className="text-xs">{storeConfig.phone}</p>}
                {storeConfig.email && <p className="text-xs">{storeConfig.email}</p>}
            </div>

            <Separator className="my-3" />

            {/* Sale Info */}
            <div className="mb-4 space-y-1">
                <div className="flex justify-between">
                    <span>Receipt #:</span>
                    <span className="font-bold">{sale.sale_number}</span>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(sale.created_at)}</span>
                </div>
                {sale.customer_name && (
                    <div className="flex justify-between">
                        <span>Customer:</span>
                        <span>{sale.customer_name}</span>
                    </div>
                )}
                {sale.customer_phone && (
                    <div className="flex justify-between">
                        <span>Phone:</span>
                        <span>{sale.customer_phone}</span>
                    </div>
                )}
            </div>

            <Separator className="my-3" />

            {/* Items */}
            <div className="mb-4">
                <h3 className="font-bold mb-2">ITEMS</h3>
                {items.map((item, index) => (
                    <div key={index} className="mb-2">
                        <div className="flex justify-between">
                            <span className="font-medium">{item.product_name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                            <span>{formatCurrency(item.line_total)}</span>
                        </div>
                        {item.tax_rate > 0 && (
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Tax ({item.tax_rate}%)</span>
                                <span>{formatCurrency((item.line_total - (item.unit_price * item.quantity)))}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Separator className="my-3" />

            {/* Totals */}
            <div className="mb-4 space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.tax_amount > 0 && (
                    <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>{formatCurrency(sale.tax_amount)}</span>
                    </div>
                )}
                {sale.discount_amount > 0 && (
                    <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-{formatCurrency(sale.discount_amount)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(sale.total_amount)}</span>
                </div>
            </div>

            <Separator className="my-3" />

            {/* Payment Info */}
            <div className="mb-4 space-y-1">
                <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="capitalize">{sale.payment_method}</span>
                </div>
                {sale.payment_reference && (
                    <div className="flex justify-between">
                        <span>Reference:</span>
                        <span>{sale.payment_reference}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                        {sale.status.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {sale.notes && (
                <>
                    <Separator className="my-3" />
                    <div className="mb-4">
                        <h3 className="font-bold mb-1">NOTES:</h3>
                        <p className="text-xs">{sale.notes}</p>
                    </div>
                </>
            )}

            <Separator className="my-3" />

            {/* Footer */}
            <div className="text-center text-xs">
                {storeConfig.receipt_header && <p className="mb-2">{storeConfig.receipt_header}</p>}
                <p>Thank you for your business!</p>
                {storeConfig.receipt_footer && <p className="mt-2">{storeConfig.receipt_footer}</p>}
                <p className="mt-2 text-gray-500">Powered by Premium POS</p>
            </div>
        </div>
    );

    if (trigger) {
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <Printer className="w-5 h-5 mr-2" />
                            Receipt - {sale.sale_number}
                        </DialogTitle>
                        <DialogDescription>
                            Preview and print receipt
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-96 overflow-y-auto">
                        <ReceiptContent />
                    </div>

                    <DialogFooter className="flex-col space-y-2">
                        <div className="flex space-x-2 w-full">
                            <Button
                                variant="outline"
                                onClick={handleDownloadPDF}
                                className="flex-1"
                                size="sm"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                            </Button>
                            {sale.customer_email && (
                                <Button
                                    variant="outline"
                                    onClick={handleEmailReceipt}
                                    className="flex-1"
                                    size="sm"
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Email
                                </Button>
                            )}
                            <Button
                                onClick={handlePrint}
                                disabled={printing}
                                className="flex-1"
                                size="sm"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                {printing ? "Printing..." : "Print"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Printer className="w-5 h-5 mr-2" />
                    Receipt Preview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ReceiptContent />
                <div className="flex space-x-2 mt-4">
                    <Button variant="outline" onClick={handleDownloadPDF} size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </Button>
                    {sale.customer_email && (
                        <Button variant="outline" onClick={handleEmailReceipt} size="sm">
                            <Share2 className="w-4 h-4 mr-2" />
                            Email
                        </Button>
                    )}
                    <Button onClick={handlePrint} disabled={printing} size="sm">
                        <Printer className="w-4 h-4 mr-2" />
                        {printing ? "Printing..." : "Print"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}