"use client";

import { useEffect, useState, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', operationType, 'at', path, error);
  alert(`Firestore Error: ${operationType} at ${path}. Check console for details.`);
}
import { Loader2, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export default function LiveTrackingPage() {
  const db = useFirestore();
  const [riders, setRiders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ridersCol = collection(db, 'riderLocations');
    console.log("Subscribing to Firestore collection: riderLocations, dbURL:", db.app.options.databaseURL);
    
    const unsubscribe = onSnapshot(ridersCol, (snapshot) => {
      const ridersData: Record<string, any> = {};
      snapshot.forEach((doc) => {
        ridersData[doc.id] = doc.data();
      });
      console.log("Riders received:", Object.keys(ridersData).length);
      setRiders(ridersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'riderLocations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    console.log("Riders:", riders);
    
    if (!mapRef.current || loading) {
        console.warn("Map not ready or loading...");
        return;
    }
    
    if (Object.keys(riders).length === 0) {
        console.log("No riders to track.");
        return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log("Map loader triggered. Riders count:", Object.keys(riders).length, "API Key present:", !!apiKey);
    
    if (!apiKey) {
        console.error("Google Maps API Key is missing!");
        return;
    }

    setOptions({
      key: apiKey,
      version: 'weekly',
    });

    Promise.all([
        importLibrary('maps'),
        importLibrary('marker')
    ]).then(([mapsLibrary, markerLibrary]) => {
      console.log("Maps and Marker libraries loaded successfully");
      const map = new mapsLibrary.Map(mapRef.current!, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
      });
      
      const { Marker } = markerLibrary;
      Object.entries(riders).forEach(([uid, location]) => {
        if (location && location.sharing) {
          new Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map,
            title: `Rider ${uid.substr(0, 8)}`,
          });
        }
      });
    }).catch(e => {
        console.error("Maps load error:", e);
        if (e.message && e.message.includes("ApiKeys")) {
            console.error("This often happens if the API key is restricted or invalid.");
        }
    });
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
                                    <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-600"/> {location.lastUpdated && !isNaN(new Date(location.lastUpdated).getTime()) ? format(new Date(location.lastUpdated), 'HH:mm:ss') : 'Invalid Date'}</div>
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
