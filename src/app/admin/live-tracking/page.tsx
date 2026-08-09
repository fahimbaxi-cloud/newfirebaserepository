"use client";

import { useEffect, useState, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ref, onValue, off } from 'firebase/database';
import { useDatabase } from '@/firebase';
import { Loader2, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { Loader } from '@googlemaps/js-api-loader';

export default function LiveTrackingPage() {
  const db = useDatabase();
  const [riders, setRiders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ridersRef = ref(db, 'riderLocations');
    console.log("Subscribing to path: riderLocations");
    onValue(ridersRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Received snapshot data:", data);
      setRiders(data || {});
      setLoading(false);
    }, (error) => {
      console.error("Firebase database error:", error);
      setLoading(false);
    });

    return () => off(ridersRef);
  }, [db]);

  useEffect(() => {
    console.log("Riders:", riders);
    if (!mapRef.current || loading || Object.keys(riders).length === 0) return;

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: 'weekly',
    });

    loader.load().then((google) => {
      console.log("Maps loaded");
      const map = new google.maps.Map(mapRef.current!, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
      });

      Object.entries(riders).forEach(([uid, location]) => {
        console.log(`Rider ${uid} sharing:`, location.sharing);
        if (location.sharing) {
          new google.maps.Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map,
            title: `Rider ${uid.substr(0, 8)}`,
          });
        }
      });
    }).catch(e => console.error("Maps load error:", e));
  }, [riders, loading]);

  return (
    <div className="pb-24 md:pb-0 md:pt-16 min-h-screen bg-blue-50/30">
      <Navbar role="admin" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-headline font-bold text-blue-600 mb-8">Live Rider Tracking</h1>
        
        <div ref={mapRef} className="h-96 w-full rounded-3xl mb-8 shadow-sm"></div>

        {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        ) : Object.keys(riders).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No riders currently sharing their location.
            </div>
        ) : (
            <div className="grid gap-4">
                {Object.entries(riders).map(([uid, location]) => (
                    location && location.sharing && (
                        <Card key={uid} className="rounded-3xl border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Rider {uid.substr(0, 8)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1"><MapPin className="w-4 h-4 text-blue-600"/> {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}</div>
                                    <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-600"/> {location.lastUpdated ? format(new Date(location.lastUpdated), 'HH:mm:ss') : 'N/A'}</div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ))}
            </div>
        )}
      </main>
    </div>
  );
}
