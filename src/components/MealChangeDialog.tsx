"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Order, MenuItem, BroadcastPackage, RawItem, TimeSlot } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, updateDoc } from 'firebase/firestore';
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
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [qty, setQty] = useState(order.packageQuantity);
  const [preferredTime, setPreferredTime] = useState('');
  const [amPm, setAmPm] = useState('AM');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>(order.slot);
  const firestore = useFirestore();
  const rawItemsQuery = useMemoFirebase(() => collection(firestore, 'raw_items'), [firestore]);
  const { data: rawItems = [] } = useCollection<RawItem>(rawItemsQuery);
  const { toast } = useToast();

  const pkg = packages.find(p => p.name === order.packageName);
  const availableDates = useMemo(() => pkg ? Array.from(new Set(Object.keys(pkg.schemeAssignments || {}))) : [], [pkg]);
  
  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  // Initialize selected package to the order's package if available
  useEffect(() => {
    if (pkg) {
      setSelectedPackageId(pkg.id);
    }
  }, [pkg]);

  // Load override data for selected date
  useEffect(() => {
    if (!selectedDate) {
      const deliveryTime = order.deliveryTime || "10:30 AM";
      const [t, p] = deliveryTime.split(' ');
      setPreferredTime(t || "10:30");
      setAmPm(p || "AM");
      setQty(order.packageQuantity || 1);
      setSelectedSlot(order.slot);
      return;
    }

    const overridePackageId = order.dailyPackageOverride?.[selectedDate];
    if (overridePackageId) {
      setSelectedPackageId(overridePackageId);
    } else if (pkg) {
      setSelectedPackageId(pkg.id);
    }

    const overrideItems = order.dailyItemsOverride?.[selectedDate];
    if (overrideItems && overrideItems.length > 0) {
      setQty(overrideItems[0].quantity);
    } else {
      setQty(order.packageQuantity || 1);
    }

    const overrideTime = order.dailyDeliveryTimeOverride?.[selectedDate] || order.deliveryTime || "10:30 AM";
    const [t, p] = overrideTime.split(' ');
    setPreferredTime(t || "10:30");
    setAmPm(p || "AM");
    
    const overrideSlot = order.dailySlotOverride?.[selectedDate] || order.slot;
    setSelectedSlot(overrideSlot);
  }, [selectedDate, order.dailyItemsOverride, order.dailyDeliveryTimeOverride, order.dailyPackageOverride, order.dailySlotOverride, order.packageQuantity, order.deliveryTime, order.slot, pkg]);

  const handleUpdate = () => {
    if (!selectedDate || !selectedPackageId) return;

    const orderRef = doc(firestore, 'orders', order.id);
    const itemsForDate = (selectedPackage.schemeAssignments && selectedPackage.schemeAssignments[selectedDate]) || [];
    const newDailyItems = itemsForDate.map(id => {
      const m = menuItems.find(m => m.id === id);
      return {
        menuItemId: id,
        name: m?.name || 'Unknown',
        quantity: qty,
        price: m?.price || 0,
        type: m?.type || 'Veg'
      };
    });
    
    const update: any = {
      [`dailyItemsOverride.${selectedDate}`]: newDailyItems,
      [`dailyDeliveryTimeOverride.${selectedDate}`]: `${preferredTime} ${amPm}`,
      [`dailyPackageOverride.${selectedDate}`]: selectedPackageId,
      [`dailySlotOverride.${selectedDate}`]: selectedSlot
    };

    updateDoc(orderRef, update)
      .then(() => {
        toast({
          title: "Order Updated",
          description: `Meal for ${selectedDate} updated to ${selectedPackage?.name}.`,
        });
        onOpenChange(false);
      })
      .catch((err) => {
        console.error("Update failed:", err);
        toast({ title: "Error", description: "Failed to update order." });
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Change Meal for Order #{order.id}</DialogTitle>
          <DialogDescription>Update scheme, quantity, and time for the selected date.</DialogDescription>
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
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Select Scheme</Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages
                      .filter(p => p.schemeAssignments && p.schemeAssignments[selectedDate])
                      .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedPackage && (
                  <div className="bg-secondary/20 p-4 rounded-xl mt-4 border border-secondary">
                    <h4 className="font-bold text-sm mb-1">{selectedPackage.name}</h4>
                    <p className="text-xs text-muted-foreground mb-3">{selectedPackage.description}</p>
                    
                    {(() => {
                      const itemsForDate = (selectedPackage.schemeAssignments && selectedPackage.schemeAssignments[selectedDate]) || [];
                      if (itemsForDate.length === 0) return null;
                      return (
                        <div className="mt-2 text-xs">
                          <p className="font-semibold text-xs text-secondary-foreground mb-1">Items included:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {itemsForDate.map((menuItemId, i) => {
                              const menuItem = menuItems.find(m => m.id === menuItemId);
                              return (
                                <li key={i}>{menuItem?.name || menuItemId}</li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })()}
                    
                    <div className="mt-3 pt-3 border-t border-secondary/50 flex justify-between text-xs font-medium">
                      <span>Type: {selectedPackage.type}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Slot</Label>
                  <Select value={selectedSlot} onValueChange={(v: TimeSlot) => setSelectedSlot(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Noon">Noon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <div className="flex gap-2">
                    <Input type="text" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
                    <Select value={amPm} onValueChange={setAmPm}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleUpdate}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
