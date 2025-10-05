import CalculatorComponent from "@/components/CalculatorComponent";
import ReceiptPrinter from "@/components/ReceiptPrinter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { emit } from "@tauri-apps/api/event";
import {
    Calculator,
    Check,
    CreditCard,
    DollarSign,
    Eye,
    History,
    Mail,
    Phone,
    Printer,
    QrCode,
    Receipt,
    RefreshCw,
    Search,
    ShoppingBag,
    ShoppingCart,
    Smartphone,
    Trash2,
    User
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    price: number;
    cost_price: number;
    tax_rate?: number;
    is_taxable: boolean;
    current_stock: number;
    minimum_stock: number;
    is_active: boolean;
    selling_price: number;
    wholesale_price: number;
    category?: string;
    brand?: string;
    unit_of_measure: string;
    weight: number;
    reorder_point: number;
    created_at: string;
    updated_at: string;
}

interface CartItem {
    product: Product;
    quantity: number;
    price: number;
    tax_amount: number;
    total: number;
    discount?: number;
}

interface CustomerInfo {
    name: string;
    phone: string;
    email: string;
}

interface PaymentInfo {
    method: string;
    amount: number;
    reference?: string;
}

interface SaleResult {
    sale_number: string;
    id: number;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    cashier_id: number;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    notes?: string;
    created_at: string;
}

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
    payment_status: string;
    notes?: string;
    created_at: string;
}

interface SaleItem {
    id: number;
    sale_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
    tax_amount: number;
    cost_price: number;
    created_at: string;
    product_name?: string;
}

interface SaleWithItems {
    sale: Sale;
    items: SaleItem[];
}

// removed unused ReturnItem interface

export default function Sales() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    // deprecated inline search; kept no state
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
    const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [isViewSaleOpen, setIsViewSaleOpen] = useState(false);
    const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
    const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithItems | null>(null);
    const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
    const [returnReason, setReturnReason] = useState("");
    const [lastCompletedSale, setLastCompletedSale] = useState<SaleResult | null>(null);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
        name: "",
        phone: "",
        email: ""
    });
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
        method: "cash",
        amount: 0,
        reference: ""
    });
    const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number; reference?: string }[]>([]);
    const [notes, setNotes] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [cartDiscount, setCartDiscount] = useState(0);
    const [productPickerOpen, setProductPickerOpen] = useState(false);
    const [barcodeValue, setBarcodeValue] = useState("");
    const barcodeInputRef = useRef<HTMLInputElement | null>(null);

    const { user } = useAuthStore();
    const canEditPriceOrDiscount = user?.role === "Admin" || user?.role === "Manager";

    const paymentMethods = [
        { value: "cash", label: "Cash", icon: DollarSign },
        { value: "card", label: "Card", icon: CreditCard },
        { value: "mobile", label: "Mobile Payment", icon: Smartphone },
        { value: "check", label: "Check", icon: Check }
    ];

    const loadProducts = async () => {
        try {
            setRefreshing(true);
            const result = await invoke<Product[]>("get_products_for_sale");
            setProducts(result);
        } catch (error) {
            console.error("Failed to load products:", error);
            toast.error("Failed to load products");
        } finally {
            setRefreshing(false);
        }
    };

    const loadRecentSales = async () => {
        try {
            const result = await invoke<Sale[]>("get_sales_history", {
                limit: 10,
                offset: 0
            });
            setRecentSales(result);
        } catch (error) {
            console.error("Failed to load recent sales:", error);
        }
    };

    const addToCart = (product: Product, quantity: number = 1) => {
        if (product.current_stock < quantity) {
            toast.error(`Only ${product.current_stock} items available in stock`);
            return;
        }

        const existingItem = cart.find(item => item.product.id === product.id);

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.current_stock) {
                toast.error(`Only ${product.current_stock} items available in stock`);
                return;
            }
            updateCartItemQuantity(product.id, newQuantity);
        } else {
            const taxAmount = product.is_taxable && product.tax_rate
                ? (product.price * quantity * product.tax_rate) / 100
                : 0;

            const newItem: CartItem = {
                product,
                quantity,
                price: product.price,
                tax_amount: taxAmount,
                total: (product.price * quantity) + taxAmount,
                discount: 0 // Initial discount 0
            };

            setCart([...cart, newItem]);
        }

        // no-op: picker closes itself; keep UX toast only
        toast.success(`${product.name} added to cart`);
    };

    const updateCartItemQuantity = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        const product = products.find(p => p.id === productId);
        if (product && quantity > product.current_stock) {
            toast.error(`Only ${product.current_stock} items available in stock`);
            return;
        }

        setCart(cart.map(item => {
            if (item.product.id === productId) {
                const basePrice = item.product.price * quantity;
                const discountAmount = (basePrice * (item.discount || 0)) / 100;
                const discountedPrice = basePrice - discountAmount;
                const taxAmount = item.product.is_taxable && item.product.tax_rate
                    ? (discountedPrice * item.product.tax_rate) / 100
                    : 0;

                return {
                    ...item,
                    quantity,
                    tax_amount: taxAmount,
                    total: discountedPrice + taxAmount
                };
            }
            return item;
        }));
    };

    const updateItemDiscount = (productId: number, discount: number) => {
        setCart(cart.map(item => {
            if (item.product.id === productId) {
                const basePrice = item.product.price * item.quantity;
                const discountAmount = (basePrice * discount) / 100;
                const discountedPrice = basePrice - discountAmount;
                const taxAmount = item.product.is_taxable && item.product.tax_rate
                    ? (discountedPrice * item.product.tax_rate) / 100
                    : 0;

                return {
                    ...item,
                    discount,
                    tax_amount: taxAmount,
                    total: discountedPrice + taxAmount
                };
            }
            return item;
        }));
    };

    const updateCartItemPrice = (productId: number, newPrice: number) => {
        if (newPrice < 0) return;
        setCart(cart.map(item => {
            if (item.product.id === productId) {
                const basePrice = newPrice * item.quantity;
                const discountAmount = (basePrice * (item.discount || 0)) / 100;
                const discountedPrice = basePrice - discountAmount;
                const taxAmount = item.product.is_taxable && item.product.tax_rate
                    ? (discountedPrice * item.product.tax_rate) / 100
                    : 0;

                return {
                    ...item,
                    price: newPrice,
                    tax_amount: taxAmount,
                    total: discountedPrice + taxAmount
                };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(item => item.product.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setCustomerInfo({ name: "", phone: "", email: "" });
        setNotes("");
        setCartDiscount(0);
    };

    const startNewSale = () => {
        clearCart();
        setPaymentInfo({ method: "cash", amount: 0, reference: "" });
        setIsCustomerDialogOpen(false);
        setIsPaymentDialogOpen(false);
        setIsReceiptDialogOpen(false);
    };

    const getSubtotal = () => {
        return cart.reduce((sum, item) => {
            const basePrice = item.product.price * item.quantity;
            return sum + basePrice;
        }, 0);
    };

    const getItemDiscountTotal = () => {
        return cart.reduce((sum, item) => {
            const basePrice = item.product.price * item.quantity;
            return sum + (basePrice * (item.discount || 0)) / 100;
        }, 0);
    };

    const getCartDiscountTotal = () => {
        const subtotalAfterItemDiscounts = getSubtotal() - getItemDiscountTotal();
        return (subtotalAfterItemDiscounts * cartDiscount) / 100;
    };

    const getDiscountTotal = () => {
        return getItemDiscountTotal() + getCartDiscountTotal();
    };

    const getTaxTotal = () => {
        return cart.reduce((sum, item) => {
            if (item.product.is_taxable && item.product.tax_rate) {
                const itemBaseAfterDiscount = (item.product.price * item.quantity) - ((item.product.price * item.quantity) * (item.discount || 0) / 100);
                return sum + (itemBaseAfterDiscount * item.product.tax_rate / 100);
            }
            return sum;
        }, 0);
    };

    const getTotal = () => (getSubtotal() - getDiscountTotal()) + getTaxTotal();

    const getChange = () => {
        return paymentInfo.amount - getTotal();
    };

    const handleQuickSale = () => {
        if (cart.length === 0) {
            toast.error("Add items to cart first");
            return;
        }

        setPaymentInfo(prev => ({ ...prev, amount: getTotal() }));
        setIsPaymentDialogOpen(true);
    };

    // Barcode/SKU quick add
    const handleBarcodeEnter = () => {
        const trimmed = barcodeValue.trim();
        if (!trimmed) return;
        const found = products.find(p => (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) || p.sku.toLowerCase() === trimmed.toLowerCase());
        if (found) {
            addToCart(found);
        } else {
            toast.error("No product matches this barcode/SKU");
        }
        setBarcodeValue("");
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        const totalPaid = paymentInfo.amount + splitPayments.reduce((s, p) => s + (p.amount || 0), 0);
        if (totalPaid < getTotal()) {
            toast.error("Payment amount is insufficient");
            return;
        }

        try {
            setProcessing(true);

            const items = cart.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                price: item.price,
                tax_amount: item.tax_amount,
                discount_amount: (item.product.price * item.quantity * (item.discount || 0)) / 100
            }));

            const result = await invoke<SaleResult>("create_sale_new", {
                customerName: customerInfo.name || undefined,
                customerPhone: customerInfo.phone || undefined,
                customerEmail: customerInfo.email || undefined,
                paymentMethod: paymentInfo.method,
                notes: (notes ? notes + "\n" : "") + (splitPayments.length ? `Split: ${splitPayments.map(p => `${p.method} ${p.amount.toFixed(2)}`).join(", ")}` : "") || undefined,
                items
            });

            setLastCompletedSale(result);
            toast.success(`Sale completed! Sale #${result.sale_number}`);

            // Clear cart and reset
            clearCart();
            setPaymentInfo({ method: "cash", amount: 0, reference: "" });
            setIsPaymentDialogOpen(false);
            setSplitPayments([]);

            // Refresh products to update stock levels
            await loadProducts();
            await loadRecentSales();

            // Notify other parts of the app (e.g., Dashboard) that a sale was created
            try {
                await emit("sale_created", {
                    id: result.id,
                    sale_number: result.sale_number,
                    total_amount: result.total_amount,
                    created_at: result.created_at,
                    customer_name: result.customer_name,
                });
            } catch (e) {
                // Non-fatal: event bus may not be available in some contexts
            }

            // Show receipt dialog
            setIsReceiptDialogOpen(true);

        } catch (error) {
            console.error("Failed to process sale:", error);
            toast.error("Failed to process sale");
        } finally {
            setProcessing(false);
        }
    };

    const openReturnDialog = async (sale: Sale) => {
        try {
            const details = await invoke<SaleWithItems>("get_sale_details", { saleId: sale.id });
            if (details) {
                setSelectedSaleDetails(details);
                setSelectedSaleForReturn(sale);
                setReturnQuantities({});
                setReturnReason("");
                setIsReturnDialogOpen(true);
            }
        } catch (error) {
            toast.error("Failed to load sale details");
        }
    };

    const openViewSale = async (sale: Sale) => {
        try {
            const details = await invoke<SaleWithItems>("get_sale_details", { saleId: sale.id });
            if (details) {
                setSelectedSaleDetails(details);
                setIsViewSaleOpen(true);
            }
        } catch (error) {
            toast.error("Failed to load sale details");
        }
    };

    const handleReturn = async () => {
        if (!selectedSaleForReturn || !selectedSaleDetails) return;

        const itemsToReturn = selectedSaleDetails.items.filter(item => (returnQuantities[item.id] || 0) > 0)
            .map(item => ({
                product_id: item.product_id,
                quantity: returnQuantities[item.id],
                refund_amount: (item.line_total / item.quantity) * returnQuantities[item.id],
                reason: returnReason // Global reason
            }));

        if (itemsToReturn.length === 0) {
            toast.error("Select items to return");
            return;
        }

        if (!returnReason.trim()) {
            toast.error("Provide a return reason");
            return;
        }

        try {
            setProcessing(true);
            await invoke("process_return", {
                saleId: selectedSaleForReturn.id,
                returnItems: itemsToReturn,
                reason: returnReason
            });
            toast.success("Return processed successfully");
            setIsReturnDialogOpen(false);
            await loadRecentSales();
            await loadProducts();
        } catch (error) {
            toast.error("Failed to process return");
        } finally {
            setProcessing(false);
        }
    };

    const handleCalculatorResult = (result: number) => {
        setPaymentInfo(prev => ({ ...prev, amount: result }));
    };

    // removed old inline search list in favor of Command picker

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    useEffect(() => {
        loadProducts();
        loadRecentSales();

        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey && e.key.toLowerCase() === "k")) {
                e.preventDefault();
                setProductPickerOpen(true);
            }
            if ((e.ctrlKey && e.key.toLowerCase() === "n")) {
                e.preventDefault();
                startNewSale();
            }
            if (e.key === "F2") {
                e.preventDefault();
                handleQuickSale();
            }
            if (e.key === "F6") {
                e.preventDefault();
                barcodeInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <div className="space-y-6 p-4 md:p-8">
            {/* Header with Quick Action */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Point of Sale</h1>
                    <p className="text-muted-foreground text-sm md:text-base">Process sales and manage transactions</p>
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => loadProducts()}
                        disabled={refreshing}
                        className="flex-1 md:flex-none"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={startNewSale}
                        variant="outline"
                        className="flex-1 md:flex-none"
                    >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        New Sale
                    </Button>
                    {cart.length > 0 && (
                        <Button
                            onClick={handleQuickSale}
                            className="bg-green-600 hover:bg-green-700 text-white text-base md:text-lg px-4 md:px-8 py-4 md:py-6 flex-1 md:flex-none"
                        >
                            <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                            Quick Sale - {formatCurrency(getTotal())}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Product Search & Cart */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Product Picker */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center text-lg md:text-xl">
                                Add Products
                                <Badge variant="outline" className="ml-auto text-xs md:text-sm">
                                    {products.length} Products Available
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                <Input
                                    ref={barcodeInputRef}
                                    placeholder="Scan barcode or type SKU, press Enter (F6 to focus)"
                                    value={barcodeValue}
                                    onChange={(e) => setBarcodeValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleBarcodeEnter();
                                    }}
                                />
                                <Button onClick={handleBarcodeEnter} variant="outline">Add by Barcode/SKU</Button>
                            </div>

                            <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start h-12">
                                        <Search className="w-4 h-4 mr-2" />
                                        Search and add products
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[420px] max-h-[360px] overflow-hidden">
                                    <Command>
                                        <CommandInput placeholder="Type a name, SKU, or barcode..." />
                                        <CommandList>
                                            <CommandEmpty>No products found.</CommandEmpty>
                                            <CommandGroup heading="Products">
                                                {products.map((product) => (
                                                    <CommandItem
                                                        key={product.id}
                                                        value={`${product.name} ${product.sku} ${product.barcode || ""}`}
                                                        onSelect={() => {
                                                            addToCart(product);
                                                            setProductPickerOpen(false);
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 bg-primary/10 rounded flex items-center justify-center">
                                                                    <QrCode className="w-4 h-4 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium leading-none">{product.name}</p>
                                                                    <p className="text-xs text-muted-foreground">SKU: {product.sku} • Stock: {product.current_stock}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-sm font-semibold">{formatCurrency(product.price)}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </CardContent>
                    </Card>

                    {/* Cart */}
                    <Card className="flex-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-lg md:text-xl">
                                <span className="flex items-center">
                                    <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                                    Shopping Cart ({cart.length} items)
                                </span>
                                {cart.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={clearCart}>
                                        Clear Cart
                                    </Button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cart.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground">
                                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
                                    <p className="text-sm">Search for products above to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-4 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Price</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead className="hidden md:table-cell">Disc %</TableHead>
                                                <TableHead className="hidden md:table-cell">Tax</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cart.map((item) => (
                                                <TableRow key={item.product.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{item.product.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                SKU: {item.product.sku}
                                                            </p>
                                                            <p className="md:hidden text-sm">Price: {formatCurrency(item.price)}</p>
                                                            <p className="md:hidden text-sm">Disc %: {item.discount || 0}</p>
                                                            <p className="md:hidden text-sm">Tax: {formatCurrency(item.tax_amount)}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            step={0.01}
                                                            value={item.price}
                                                            onChange={(e) => updateCartItemPrice(item.product.id, parseFloat(e.target.value) || 0)}
                                                            className="w-24"
                                                            disabled={!canEditPriceOrDiscount}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={item.product.current_stock}
                                                            value={item.quantity}
                                                            onChange={(e) => updateCartItemQuantity(item.product.id, Math.max(1, Math.min(parseInt(e.target.value) || 1, item.product.current_stock)))}
                                                            className="w-20"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={item.discount || 0}
                                                            onChange={(e) => updateItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                                                            className="w-20"
                                                            disabled={!canEditPriceOrDiscount}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">{formatCurrency(item.tax_amount)}</TableCell>
                                                    <TableCell className="font-bold">{formatCurrency(item.total)}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeFromCart(item.product.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Cart Summary */}
                                    <div className="border-t pt-4 space-y-3">
                                        <div className="flex justify-between text-base md:text-lg">
                                            <span>Subtotal:</span>
                                            <span className="font-medium">{formatCurrency(getSubtotal())}</span>
                                        </div>
                                        <div className="flex justify-between text-base md:text-lg">
                                            <span>Discount:</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(getDiscountTotal())}</span>
                                        </div>
                                        <div className="flex justify-between text-base md:text-lg">
                                            <span>Tax:</span>
                                            <span className="font-medium">{formatCurrency(getTaxTotal())}</span>
                                        </div>
                                        <div className="flex justify-between text-xl md:text-2xl font-bold border-t pt-3">
                                            <span>Total:</span>
                                            <span>{formatCurrency(getTotal())}</span>
                                        </div>
                                    </div>

                                    {/* Overall Cart Discount */}
                                    <div className="space-y-2">
                                        <Label htmlFor="cart-discount">Overall Discount (%)</Label>
                                        <Input
                                            id="cart-discount"
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={cartDiscount}
                                            onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>

                                    {/* Customer Info & Actions */}
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsCustomerDialogOpen(true)}
                                                className="h-12"
                                            >
                                                <User className="w-4 h-4 mr-2" />
                                                {customerInfo.name ? "Edit Customer" : "Add Customer"}
                                            </Button>
                                            <Button
                                                onClick={handleQuickSale}
                                                className="bg-green-600 hover:bg-green-700 text-white h-12"
                                            >
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                Checkout
                                            </Button>
                                        </div>

                                        {customerInfo.name && (
                                            <div className="p-3 bg-muted rounded-lg">
                                                <p className="font-medium">{customerInfo.name}</p>
                                                {customerInfo.phone && (
                                                    <p className="text-sm text-muted-foreground">
                                                        <Phone className="w-3 h-3 inline mr-1" />
                                                        {customerInfo.phone}
                                                    </p>
                                                )}
                                                {customerInfo.email && (
                                                    <p className="text-sm text-muted-foreground">
                                                        <Mail className="w-3 h-3 inline mr-1" />
                                                        {customerInfo.email}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <Label htmlFor="notes">Sale Notes</Label>
                                            <Textarea
                                                id="notes"
                                                placeholder="Add any special instructions or notes..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Quick Actions & Info */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <CalculatorComponent
                                onResult={handleCalculatorResult}
                                trigger={
                                    <Button variant="outline" className="w-full justify-start">
                                        <Calculator className="w-4 h-4 mr-2" />
                                        Calculator
                                    </Button>
                                }
                            />
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => setIsSalesHistoryOpen(true)}
                            >
                                <History className="w-4 h-4 mr-2" />
                                Sales History
                            </Button>
                            {lastCompletedSale && (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => setIsReceiptDialogOpen(true)}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Last Receipt
                                </Button>
                            )}
                            <Button variant="outline" className="w-full justify-start">
                                <QrCode className="w-4 h-4 mr-2" />
                                Scan Barcode
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Payment Summary */}
                    {cart.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg md:text-xl">Payment Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm md:text-base">
                                    <span>Total Items:</span>
                                    <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm md:text-base">
                                    <span>Subtotal:</span>
                                    <span className="font-medium">{formatCurrency(getSubtotal())}</span>
                                </div>
                                <div className="flex justify-between text-sm md:text-base">
                                    <span>Discount:</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(getDiscountTotal())}</span>
                                </div>
                                <div className="flex justify-between text-sm md:text-base">
                                    <span>Tax:</span>
                                    <span className="font-medium">{formatCurrency(getTaxTotal())}</span>
                                </div>
                                <div className="border-t pt-2">
                                    <div className="flex justify-between text-lg md:text-xl font-bold">
                                        <span>Total:</span>
                                        <span className="text-green-600">{formatCurrency(getTotal())}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Sales */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center text-lg md:text-xl">
                                <Receipt className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                                Recent Sales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentSales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No recent sales</p>
                            ) : (
                                <div className="space-y-2">
                                    {recentSales.slice(0, 5).map((sale) => (
                                        <div key={sale.id} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm md:text-base">
                                            <div>
                                                <p className="font-medium">{sale.sale_number}</p>
                                                <p className="text-xs md:text-sm text-muted-foreground">
                                                    {formatDate(sale.created_at)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">{formatCurrency(sale.total_amount)}</p>
                                                <Badge variant="outline" className="text-xs">
                                                    {sale.payment_status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {recentSales.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="w-full mt-3"
                                    size="sm"
                                    onClick={() => setIsSalesHistoryOpen(true)}
                                >
                                    View All Sales
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Customer Information Dialog */}
            <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Customer Information</DialogTitle>
                        <DialogDescription>
                            Add customer details for this sale (optional)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Split payments */}
                        <div className="space-y-2">
                            {splitPayments.map((p, idx) => (
                                <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                                    <Select value={p.method} onValueChange={(val) => setSplitPayments(s => s.map((sp, i) => i === idx ? { ...sp, method: val } : sp))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods.map(pm => (
                                                <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        step={0.01}
                                        min={0}
                                        value={p.amount}
                                        onChange={(e) => setSplitPayments(s => s.map((sp, i) => i === idx ? { ...sp, amount: parseFloat(e.target.value) || 0 } : sp))}
                                    />
                                    <Input
                                        placeholder="Reference"
                                        value={p.reference || ""}
                                        onChange={(e) => setSplitPayments(s => s.map((sp, i) => i === idx ? { ...sp, reference: e.target.value } : sp))}
                                    />
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setSplitPayments(sp => [...sp, { method: "cash", amount: 0 }])}>Add Split</Button>
                                {splitPayments.length > 0 && (
                                    <Button type="button" variant="outline" onClick={() => setSplitPayments([])}>Clear Splits</Button>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="customer-name">Full Name</Label>
                            <Input
                                id="customer-name"
                                placeholder="Customer full name"
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="customer-phone">Phone Number</Label>
                            <Input
                                id="customer-phone"
                                placeholder="Phone number"
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="customer-email">Email Address</Label>
                            <Input
                                id="customer-email"
                                type="email"
                                placeholder="Email address"
                                value={customerInfo.email}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => setIsCustomerDialogOpen(false)}>
                            Save Customer Info
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Payment</DialogTitle>
                        <DialogDescription>
                            Complete the payment for {formatCurrency(getTotal())}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="payment-method">Payment Method</Label>
                            <Select value={paymentInfo.method} onValueChange={(value) => setPaymentInfo({ ...paymentInfo, method: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map((method) => {
                                        const Icon = method.icon;
                                        return (
                                            <SelectItem key={method.value} value={method.value}>
                                                <div className="flex items-center">
                                                    <Icon className="w-4 h-4 mr-2" />
                                                    {method.label}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="payment-amount">Amount Received</Label>
                            <div className="flex space-x-2">
                                <Input
                                    id="payment-amount"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={paymentInfo.amount}
                                    onChange={(e) => setPaymentInfo({ ...paymentInfo, amount: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    className="flex-1 text-lg"
                                />
                                <CalculatorComponent
                                    onResult={handleCalculatorResult}
                                    trigger={
                                        <Button variant="outline" size="sm">
                                            <Calculator className="w-4 h-4" />
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                        {paymentInfo.method !== "cash" && (
                            <div>
                                <Label htmlFor="payment-reference">Reference Number</Label>
                                <Input
                                    id="payment-reference"
                                    placeholder="Transaction reference or check number"
                                    value={paymentInfo.reference}
                                    onChange={(e) => setPaymentInfo({ ...paymentInfo, reference: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Payment Summary */}
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(getSubtotal())}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount:</span>
                                <span className="text-red-600">-{formatCurrency(getDiscountTotal())}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>{formatCurrency(getTaxTotal())}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(getTotal())}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Amount Received:</span>
                                <span className="font-medium">{formatCurrency(paymentInfo.amount)}</span>
                            </div>
                        </div>

                        {paymentInfo.amount > getTotal() && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between font-bold text-green-800 text-lg">
                                    <span>Change to Give:</span>
                                    <span>{formatCurrency(getChange())}</span>
                                </div>
                            </div>
                        )}
                        {paymentInfo.amount < getTotal() && paymentInfo.amount > 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex justify-between font-medium text-red-800">
                                    <span>Amount Remaining:</span>
                                    <span>{formatCurrency(getTotal() - paymentInfo.amount)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={processing || paymentInfo.amount < getTotal()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing ? "Processing..." : `Complete Sale - ${formatCurrency(getTotal())}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Return Dialog */}
            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Return for Sale #{selectedSaleForReturn?.sale_number}</DialogTitle>
                        <DialogDescription>
                            Select quantities to return for each item
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSaleDetails && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Sold Qty</TableHead>
                                        <TableHead>Return Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedSaleDetails.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.product_name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    value={returnQuantities[item.id] || 0}
                                                    onChange={(e) => setReturnQuantities({
                                                        ...returnQuantities,
                                                        [item.id]: parseInt(e.target.value) || 0
                                                    })}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="return-reason">Return Reason</Label>
                            <Textarea
                                id="return-reason"
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleReturn} disabled={processing}>
                            Process Return
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Sale Dialog */}
            <Dialog open={isViewSaleOpen} onOpenChange={setIsViewSaleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sale Details - #{selectedSaleDetails?.sale.sale_number}</DialogTitle>
                        <DialogDescription>
                            View items and details for this sale
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSaleDetails && (
                        <div className="space-y-4">
                            <div>
                                <p><strong>Customer:</strong> {selectedSaleDetails.sale.customer_name || 'Walk-in'}</p>
                                <p><strong>Date:</strong> {formatDate(selectedSaleDetails.sale.created_at)}</p>
                                <p><strong>Total:</strong> {formatCurrency(selectedSaleDetails.sale.total_amount)}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSaleDetails.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.product_name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                                                <TableCell>{formatCurrency(item.line_total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsViewSaleOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sales History Dialog */}
            <Dialog open={isSalesHistoryOpen} onOpenChange={setIsSalesHistoryOpen}>
                <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Sales History</DialogTitle>
                        <DialogDescription>
                            View and manage recent sales transactions
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {recentSales.length === 0 ? (
                            <div className="text-center py-8">
                                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-muted-foreground">No sales transactions found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sale #</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Payment</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentSales.map((sale) => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-medium">
                                                    {sale.sale_number}
                                                </TableCell>
                                                <TableCell>
                                                    {sale.customer_name || "Walk-in Customer"}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(sale.created_at)}
                                                </TableCell>
                                                <TableCell className="capitalize">
                                                    {sale.payment_method}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {formatCurrency(sale.total_amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={sale.payment_status === 'completed' ? 'default' : 'secondary'}>
                                                        {sale.payment_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="flex space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => openViewSale(sale)}>
                                                        <Eye className="w-4 h-4 mr-2" /> View
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => openReturnDialog(sale)}>
                                                        Return
                                                    </Button>
                                                    <Button variant="outline" size="sm">
                                                        <Printer className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsSalesHistoryOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Dialog */}
            {lastCompletedSale && (
                <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center">
                                <Printer className="w-5 h-5 mr-2" />
                                Receipt - {lastCompletedSale.sale_number}
                            </DialogTitle>
                            <DialogDescription>
                                Sale completed successfully
                            </DialogDescription>
                        </DialogHeader>

                        <ReceiptPrinter
                            sale={{
                                id: lastCompletedSale.id,
                                sale_number: lastCompletedSale.sale_number,
                                customer_name: lastCompletedSale.customer_name,
                                customer_phone: lastCompletedSale.customer_phone,
                                customer_email: lastCompletedSale.customer_email,
                                subtotal: lastCompletedSale.subtotal,
                                tax_amount: lastCompletedSale.tax_amount,
                                discount_amount: lastCompletedSale.discount_amount,
                                total_amount: lastCompletedSale.total_amount,
                                payment_method: lastCompletedSale.payment_method,
                                status: lastCompletedSale.payment_status,
                                notes: lastCompletedSale.notes,
                                created_at: lastCompletedSale.created_at
                            }}
                            items={cart.map(item => ({
                                id: item.product.id,
                                product_name: item.product.name,
                                quantity: item.quantity,
                                unit_price: item.price,
                                tax_rate: item.product.tax_rate || 0,
                                line_total: item.total
                            }))}
                        />

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsReceiptDialogOpen(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}