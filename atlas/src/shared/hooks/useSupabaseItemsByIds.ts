import { useEffect, useState } from "react";
import supabase from "../helpers/supabase";

export function useSupabaseItemsByIds<T>(
  table: string,
  ids: string[]
): { items: T[]; loading: boolean; error: any } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!ids || ids.length === 0) {
      setItems([]);
      return;
    }

    setLoading(true);
    supabase
      .from(table)
      .select("*")
      .in("id", ids)
      .then(({ data, error }) => {
        if (error) setError(error);
        else if (data) setItems(data as T[]);
        setLoading(false);
      });
  }, [table, ids]);

  return { items, loading, error };
}
