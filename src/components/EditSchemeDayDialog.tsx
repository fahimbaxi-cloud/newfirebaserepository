"use client";

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Order, BroadcastPackage, MenuItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Minus, Plus } from 'lucide-react';

interface EditSchemeDayDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  allPackages: BroadcastPackage[];
  allMenuItems: MenuItem[];
}

export default function EditSchemeDayDialog({ order, isOpen, onClose, allPackages, allMenuItems }: EditSchemeDayDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const firestore = useFirestore();
  const { toast } = useToast();

  const pkg = useMemo(() => allPackages.find(p => p.name === order?.packageName), [order, allPackages]);
  const dates = useMemo(() => pkg ? Object.keys(pkg.schemeAssignments || {}) : [], [pkg]);

  // Initialize overrides state
  useEffect(() => {
      if (order?.dayOverrides) {
          setOverrides(order.dayOverrides);
      }
  }, [order]);

  const handleMealToggle = (menuItemId: string, date: string) => {
      const currentOverrides = overrides[date] || pkg?.schemeAssignments?.[date] || [];
      const newOverrides = currentOverrides.includes(menuItemId) 
        ? currentOverrides.filter(id => id !== menuItemId)
        : [...currentOverrides, menuItemId];
        
      setOverrides({ ...overrides, [date]: newOverrides });
  };

  const handleSave = async () => {
    if (!order || !selectedDate) return;
    
    await updateDocumentNonBlocking(doc(firestore, 'orders', order.id), {
        dayOverrides: overrides
    });
    
    toast({ title: "Updated", description: "Scheme day meal updated successfully." });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scheme Day</DialogTitle>
          <DialogDescription className="space-y-1">
            <p>Customer: <span className="font-bold text-foreground">{order?.customerName}</span></p>
            <p>Scheme: <span className="font-bold text-foreground">{pkg?.name}</span></p>
            <p>Date Range: <span className="font-bold text-foreground">{pkg?.startDate} to {pkg?.endDate}</span></p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 border rounded-lg">
                <option value="">Select Date</option>
                {dates.map(date => <option key={date} value={date}>{date}</option>)}
            </select>
            
            {selectedDate && (
                <ScrollArea className="h-[400px]">
                    {allMenuItems.map(menuItem => {
                        // Determine if this item is selected for the selected date
                        const dayItemIds = overrides[selectedDate] || pkg?.schemeAssignments?.[selectedDate] || [];
                        const isSelected = dayItemIds.includes(menuItem.id);
                        
                        return (
                            <div key={menuItem.id} className={`p-4 border rounded-xl mb-4 ${isSelected ? 'border-emerald-500 bg-emerald-50' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold">{menuItem.name}</div>
                                    <Badge variant={isSelected ? "default" : "outline"}>{menuItem.type}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Rs {menuItem.price}</span>
                                    <div className="flex items-center gap-2">
                                        <Button size="icon" variant="outline" onClick={() => handleMealToggle(menuItem.id, selectedDate)}>
                                            {isSelected ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                        </Button>
                                        <span className="font-bold">{isSelected ? 1 : 0}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </ScrollArea>
            )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
