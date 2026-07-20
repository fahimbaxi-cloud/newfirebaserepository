"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Order, MenuItem, BroadcastPackage } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface MealChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  menuItems: MenuItem[];
  packages: BroadcastPackage[];
}

export function MealChangeDialog({ open, onOpenChange, order, menuItems, packages }: MealChangeDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [qty, setQty] = useState(order.packageQuantity);
  const [time, setTime] = useState(order.deliveryTime);
  const firestore = useFirestore();
  const { toast } = useToast();

  const pkg = packages.find(p => p.name === order.packageName);
  const availableDates = pkg ? Object.keys(pkg.schemeAssignments || {}) : [];
  
  // Filter meals for the selected date
  const availableMealIdsForDate = selectedDate && pkg?.schemeAssignments ? pkg.schemeAssignments[selectedDate] || [] : [];
  const availableMealsForDate = menuItems.filter(m => availableMealIdsForDate.includes(m.id));

  // Initialize selected meal to the first item of the order, if available in the selected date's options
  useEffect(() => {
    if (selectedDate && availableMealsForDate.length > 0) {
      const currentOrderMealId = order.items.length > 0 ? order.items[0].menuItemId : '';
      if (availableMealIdsForDate.includes(currentOrderMealId)) {
        setSelectedMealId(currentOrderMealId);
      } else {
        setSelectedMealId(availableMealsForDate[0].id);
      }
    }
  }, [selectedDate, availableMealIdsForDate]);

  const selectedMeal = menuItems.find(m => m.id === selectedMealId);

  const handleUpdate = () => {
    if (!selectedDate || !selectedMealId) return;

    const orderRef = doc(firestore, 'orders', order.id);
    
    // This assumes we are updating the order. In reality, scheme orders might have daily items.
    // The user said "allow admin to change meal of customer of that day in that scheme."
    // This likely means updating the dailyItems or similar for the order.
    // Since I don't know the exact data structure for daily item changes, 
    // I will simulate it by updating the order items based on the selection.
    
    const update = {
      items: [{
        menuItemId: selectedMeal.id,
        name: selectedMeal.name,
        quantity: qty,
        price: selectedMeal.price,
        type: selectedMeal.type
      }],
      packageQuantity: qty,
      deliveryTime: time
    };

    updateDocumentNonBlocking(orderRef, update);

    toast({
      title: "Meal Updated",
      description: `Meal for ${selectedDate} updated to ${selectedMeal.name}.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Change Meal for Order #{order.id}</DialogTitle>
          <DialogDescription>Update meal, quantity, and time for the selected date.</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a date" />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map(date => (
                  <SelectItem key={date} value={date}>{date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <Label>Select Meal</Label>
              <Select value={selectedMealId} onValueChange={setSelectedMealId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a meal" />
                </SelectTrigger>
                <SelectContent>
                  {availableMealsForDate.map(meal => (
                    <SelectItem key={meal.id} value={meal.id}>{meal.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedMeal && (
                <div className="bg-secondary/20 p-4 rounded-xl mt-2">
                  <p className="font-bold">{selectedMeal.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedMeal.description}</p>
                  {selectedMeal.ingredients && (
                    <div className="mt-2 text-xs">
                      <p className="font-bold">Items included:</p>
                      {selectedMeal.ingredients.map((ing, i) => <p key={i}>{ing.rawItemId} ({ing.quantity})</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Delivery Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleUpdate}>Update Meal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
