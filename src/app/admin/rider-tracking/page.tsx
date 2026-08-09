'use client'

import { RiderMap } from '@/components/RiderMap';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function RiderTrackingPage() {
    const firestore = useFirestore();
    const riderLocationsQuery = useMemoFirebase(() => collection(firestore, 'riderLocations'), [firestore]);
    const { data: riders = [] } = useCollection<any>(riderLocationsQuery);

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">Live Rider Tracking</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-1 rounded-3xl">
                    <CardHeader><CardTitle>Active Riders</CardTitle></CardHeader>
                    <CardContent>
                        {(riders || []).filter(r => r.sharing).map(r => (
                            <div key={r.riderUid} className="flex items-center justify-between p-2 border-b">
                                <span>{r.riderUid}</span>
                                <span className={cn("text-xs font-bold", Date.now() - new Date(r.lastUpdated).getTime() < 30000 ? "text-green-500" : "text-red-500")}>
                                    {Date.now() - new Date(r.lastUpdated).getTime() < 30000 ? "Online" : "Stale"}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="col-span-2 rounded-3xl">
                    <CardContent className="p-0 overflow-hidden rounded-3xl">
                        <RiderMap riders={riders} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
