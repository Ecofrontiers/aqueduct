import { useState, useEffect } from "react";
import supabase from "../helpers/supabase";

export function useSupabaseItemById<T>(tableName: string, id?: string) {
  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;

    async function getItem() {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single(); // Assuming we are fetching a single item

      if (error) {
        console.error(`Error fetching ${tableName} by ID:`, error);
        setItem(null);
      } else {
        setItem(data || null);
      }
      setLoading(false);
    }

    getItem();
  }, [tableName, id]);

  return { item, loading };
}
