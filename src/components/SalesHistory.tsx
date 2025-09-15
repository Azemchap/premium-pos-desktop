import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/core";
import {
    Clock,
    CreditCard,
    DollarSign,
    Eye,
    Filter,
    MoreHorizontal,
    Printer,
    Receipt,
    RefreshCw,
    Search,
    XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Sale {
    payment_status: string;
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
    user_id: number;
    shift_id?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

interface SaleItem {
    id: number;
    sale_id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    discount_amount: number;
    line_total: number;
    created_at: string;
}

interface SaleWithItems {
    sale: Sale;
    items: SaleItem[];
}

export default function SalesHistory() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
    const [voidReason, setVoidReason] = useState("");
    const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
    const [processing, setProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const loadSales = async () => {
        try {
            setLoading(true);
            const result = await invoke<Sale[]>("get_sales_history", {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                search: searchQuery || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            });
            setSales(result);
        } catch (error) {
            console.error("Failed to load sales:", error);
            toast.error("Failed to load sales history");
        } finally {
            setLoading(false);
        }
    };

    const loadSaleDetails = async (saleId: number) => {
        try {
            const result = await invoke<SaleWithItems>("get_sale_details", { saleId });
            if (result) {
                setSelectedSale(result);
                setIsDetailsDialogOpen(true);
            }
        } catch (error) {
            console.error("Failed to load sale details:", error);
            toast.error("Failed to load sale details");
        }
    };

    const handleVoidSale = async () => {
        if (!saleToVoid || !voidReason.trim()) return;

        try {
            setProcessing(true);
            await invoke("void_sale", {
                saleId: saleToVoid.id,
                reason: voidReason,
            });

            toast.success(`Sale ${saleToVoid.sale_number} has been voided`);
            setIsVoidDialogOpen(false);
            setSaleToVoid(null);
            setVoidReason("");
            loadSales(); // Refresh the list
        } catch (error) {
            console.error("Failed to void sale:", error);
            toast.error("Failed to void sale");
        } finally {
            setProcessing(false);
        }
    };

    const handlePrintReceipt = async (sale: Sale) => {
        try {
            // TODO: Implement actual receipt printing
            console.log("Printing receipt for sale:", sale.sale_number);
            toast.success("Receipt sent to printer");
        } catch (error) {
            console.error("Failed to print receipt:", error);
            toast.error("Failed to print receipt");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
            case "voided":
                return <Badge variant="destructive">Voided</Badge>;
            case "refunded":
                return <Badge className="bg-yellow-100 text-yellow-800">Refunded</Badge>;
            case "partially_refunded":
                return <Badge className="bg-orange-100 text-orange-800">Partial Refund</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case "cash":
                return <DollarSign className="w-4 h-4" />;
            case "card":
                return <CreditCard className="w-4 h-4" />;
            default:
                return <CreditCard className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    useEffect(() => {
        loadSales();
    }, [currentPage, searchQuery, dateFrom, dateTo]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Sales History</h1>
                    <p className="text-muted-foreground">
                        View and manage all sales transactions
                    </p>
                </div>
                <Button onClick={loadSales} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Filter className="w-5 h-5 mr-2" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    id="search"
                                    placeholder="Sale number, customer..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="date-from">From Date</Label>
                            <Input
                                id="date-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="date-to">To Date</Label>
                            <Input
                                id="date-to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery("");
                                    setDateFrom("");
                                    setDateTo("");
                                }}
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sales Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Sales Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No sales found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sale #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">
                                                {sale.sale_number}
                                            </TableCell>
                                            <TableCell>
                                                {sale.customer_name ? (
                                                    <div>
                                                        <p className="font-medium">{sale.customer_name}</p>
                                                        {sale.customer_phone && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {sale.customer_phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">Walk-in</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                                                    {formatDate(sale.created_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    {getPaymentMethodIcon(sale.payment_method)}
                                                    <span className="ml-2 capitalize">
                                                        {sale.payment_method}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                {formatCurrency(sale.total_amount)}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(sale.payment_status)}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => loadSaleDetails(sale.id)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handlePrintReceipt(sale)}
                                                        >
                                                            <Printer className="w-4 h-4 mr-2" />
                                                            Print Receipt
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {sale.status === "completed" && (
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => {
                                                                    setSaleToVoid(sale);
                                                                    setIsVoidDialogOpen(true);
                                                                }}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Void Sale
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {sales.length === itemsPerPage && (
                        <div className="flex justify-center mt-4">
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sale Details Dialog */}
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Sale Details</DialogTitle>
                        <DialogDescription>
                            {selectedSale && `Sale ${selectedSale.sale.sale_number}`}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSale && (
                        <div className="space-y-6">
                            {/* Sale Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Sale Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Sale Number:</span>
                                            <span className="font-medium">{selectedSale.sale.sale_number}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Date:</span>
                                            <span>{formatDate(selectedSale.sale.created_at)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Status:</span>
                                            {getStatusBadge(selectedSale.sale.status)}
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Payment Method:</span>
                                            <span className="capitalize">{selectedSale.sale.payment_method}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Customer Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Name:</span>
                                            <span>{selectedSale.sale.customer_name || "Walk-in"}</span>
                                        </div>
                                        {selectedSale.sale.customer_phone && (
                                            <div className="flex justify-between">
                                                <span>Phone:</span>
                                                <span>{selectedSale.sale.customer_phone}</span>
                                            </div>
                                        )}
                                        {selectedSale.sale.customer_email && (
                                            <div className="flex justify-between">
                                                <span>Email:</span>
                                                <span>{selectedSale.sale.customer_email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="font-semibold mb-2">Items</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Tax Rate</TableHead>
                                            <TableHead>Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSale.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    {item.product_name}
                                                </TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                                                <TableCell>{item.tax_rate}%</TableCell>
                                                <TableCell>{formatCurrency(item.line_total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Totals */}
                            <div className="border-t pt-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>{formatCurrency(selectedSale.sale.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span>{formatCurrency(selectedSale.sale.tax_amount)}</span>
                                    </div>
                                    {selectedSale.sale.discount_amount > 0 && (
                                        <div className="flex justify-between">
                                            <span>Discount:</span>
                                            <span>-{formatCurrency(selectedSale.sale.discount_amount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-semibold">
                                        <span>Total:</span>
                                        <span>{formatCurrency(selectedSale.sale.total_amount)}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedSale.sale.notes && (
                                <div>
                                    <h3 className="font-semibold mb-2">Notes</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedSale.sale.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => selectedSale && handlePrintReceipt(selectedSale.sale)}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Receipt
                        </Button>
                        <Button onClick={() => setIsDetailsDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Void Sale Dialog */}
            <AlertDialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Void Sale</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to void sale {saleToVoid?.sale_number}? This action cannot be undone and will restore the inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="my-4">
                        <Label htmlFor="void-reason">Reason for voiding</Label>
                        <Textarea
                            id="void-reason"
                            placeholder="Enter reason for voiding this sale..."
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleVoidSale}
                            disabled={!voidReason.trim() || processing}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {processing ? "Voiding..." : "Void Sale"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}