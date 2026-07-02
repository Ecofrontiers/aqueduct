import { useState, useEffect } from "react";
import supabase from "../helpers/supabase";

export function useSupabaseTable<T, K = T>(
  tableName: string,
  formatter?: (data: T[]) => K[]
) {
  const [data, setData] = useState<K[] | null>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getData();
    async function getData() {
      const { data, error } = await supabase.from(tableName).select();
      if (error) {
        console.error(`Error fetching data from ${tableName}:`, error);
        setData(null);
      } else {
        const formattedData = formatter
          ? formatter(data)
          : (data as unknown as K[]);
        setData(formattedData);
      }
      setLoading(false);
    }
  }, [tableName, formatter]);

  return { data, loading };
}
