import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Calculator, Delete, Divide, X, Minus, Plus, Equal } from "lucide-react";

interface CalculatorProps {
    onResult?: (result: number) => void;
    trigger?: React.ReactNode;
}

export default function CalculatorComponent({ onResult, trigger }: CalculatorProps) {
    const [display, setDisplay] = useState("0");
    const [previousValue, setPreviousValue] = useState<number | null>(null);
    const [operation, setOperation] = useState<string | null>(null);
    const [waitingForNewValue, setWaitingForNewValue] = useState(false);

    const inputNumber = (num: string) => {
        if (waitingForNewValue) {
            setDisplay(num);
            setWaitingForNewValue(false);
        } else {
            setDisplay(display === "0" ? num : display + num);
        }
    };

    const inputDecimal = () => {
        if (waitingForNewValue) {
            setDisplay("0.");
            setWaitingForNewValue(false);
        } else if (display.indexOf(".") === -1) {
            setDisplay(display + ".");
        }
    };

    const clear = () => {
        setDisplay("0");
        setPreviousValue(null);
        setOperation(null);
        setWaitingForNewValue(false);
    };

    const performOperation = (nextOperation: string) => {
        const inputValue = parseFloat(display);

        if (previousValue === null) {
            setPreviousValue(inputValue);
        } else if (operation) {
            const currentValue = previousValue || 0;
            const newValue = calculate(currentValue, inputValue, operation);

            setDisplay(String(newValue));
            setPreviousValue(newValue);
        }

        setWaitingForNewValue(true);
        setOperation(nextOperation);
    };

    const calculate = (firstValue: number, secondValue: number, operation: string): number => {
        switch (operation) {
            case "+":
                return firstValue + secondValue;
            case "-":
                return firstValue - secondValue;
            case "*":
                return firstValue * secondValue;
            case "/":
                return firstValue / secondValue;
            case "=":
                return secondValue;
            default:
                return secondValue;
        }
    };

    const handleEquals = () => {
        const inputValue = parseFloat(display);

        if (previousValue !== null && operation) {
            const newValue = calculate(previousValue, inputValue, operation);
            setDisplay(String(newValue));

            if (onResult) {
                onResult(newValue);
            }

            setPreviousValue(null);
            setOperation(null);
            setWaitingForNewValue(true);
        }
    };

    const handleBackspace = () => {
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay("0");
        }
    };

    const buttonClass = "h-12 text-lg font-medium transition-colors";
    const operatorClass = `${buttonClass} bg-orange-500 hover:bg-orange-600 text-white`;
    const numberClass = `${buttonClass} bg-gray-100 hover:bg-gray-200 text-gray-900`;
    const actionClass = `${buttonClass} bg-gray-300 hover:bg-gray-400 text-gray-900`;

    const CalculatorContent = () => (
        <Card className="w-full max-w-sm mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Calculator
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Display */}
                <div className="bg-gray-900 text-white p-4 rounded-lg text-right">
                    <div className="text-2xl font-mono">{display}</div>
                    {operation && previousValue !== null && (
                        <div className="text-sm text-gray-400">
                            {previousValue} {operation}
                        </div>
                    )}
                </div>

                {/* Buttons Grid */}
                <div className="grid grid-cols-4 gap-2">
                    {/* Row 1 */}
                    <Button onClick={clear} className={`${actionClass} col-span-2`}>
                        Clear
                    </Button>
                    <Button onClick={handleBackspace} className={actionClass}>
                        <Delete className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => performOperation("/")} className={operatorClass}>
                        <Divide className="w-4 h-4" />
                    </Button>

                    {/* Row 2 */}
                    <Button onClick={() => inputNumber("7")} className={numberClass}>
                        7
                    </Button>
                    <Button onClick={() => inputNumber("8")} className={numberClass}>
                        8
                    </Button>
                    <Button onClick={() => inputNumber("9")} className={numberClass}>
                        9
                    </Button>
                    <Button onClick={() => performOperation("*")} className={operatorClass}>
                        <X className="w-4 h-4" />
                    </Button>

                    {/* Row 3 */}
                    <Button onClick={() => inputNumber("4")} className={numberClass}>
                        4
                    </Button>
                    <Button onClick={() => inputNumber("5")} className={numberClass}>
                        5
                    </Button>
                    <Button onClick={() => inputNumber("6")} className={numberClass}>
                        6
                    </Button>
                    <Button onClick={() => performOperation("-")} className={operatorClass}>
                        <Minus className="w-4 h-4" />
                    </Button>

                    {/* Row 4 */}
                    <Button onClick={() => inputNumber("1")} className={numberClass}>
                        1
                    </Button>
                    <Button onClick={() => inputNumber("2")} className={numberClass}>
                        2
                    </Button>
                    <Button onClick={() => inputNumber("3")} className={numberClass}>
                        3
                    </Button>
                    <Button onClick={() => performOperation("+")} className={operatorClass}>
                        <Plus className="w-4 h-4" />
                    </Button>

                    {/* Row 5 */}
                    <Button onClick={() => inputNumber("0")} className={`${numberClass} col-span-2`}>
                        0
                    </Button>
                    <Button onClick={inputDecimal} className={numberClass}>
                        .
                    </Button>
                    <Button onClick={handleEquals} className={operatorClass}>
                        <Equal className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    if (trigger) {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Calculator</DialogTitle>
                    </DialogHeader>
                    <CalculatorContent />
                </DialogContent>
            </Dialog>
        );
    }

    return <CalculatorContent />;
}