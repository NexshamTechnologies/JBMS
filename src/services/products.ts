import { supabase } from "../lib/supabase";
import type { Product } from "../types";

const TABLE = "products";

/**
 * Database row returned by Supabase.
 * This matches PostgreSQL column names.
 */
interface ProductRow {
  id: number;
  product_name: string;
  category: string | null;
  fabric_type: string | null;
  unit: string;
  hsn_code: string | null;
  gst_rate: number;
  selling_price: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Convert database row -> frontend model
 */
function mapRowToProduct(row: ProductRow): Product {
  return {
    id: String(row.id),
    name: row.product_name,
    category: row.category ?? "",
    fabricType: row.fabric_type ?? "",
    unit: row.unit,
    hsnCode: row.hsn_code ?? "",
    gstRate: Number(row.gst_rate),
    sellingPrice: Number(row.selling_price),
  };
}

/**
 * Convert frontend model -> database row
 */
function mapProductToRow(product: Partial<Product>) {
  return {
    ...(product.name !== undefined && {
      product_name: product.name,
    }),

    ...(product.category !== undefined && {
      category: product.category,
    }),

    ...(product.fabricType !== undefined && {
      fabric_type: product.fabricType,
    }),

    ...(product.unit !== undefined && {
      unit: product.unit,
    }),

    ...(product.hsnCode !== undefined && {
      hsn_code: product.hsnCode,
    }),

    ...(product.gstRate !== undefined && {
      gst_rate: product.gstRate,
    }),

    ...(product.sellingPrice !== undefined && {
      selling_price: product.sellingPrice,
    }),
  };
}

/* =======================================================
   GET ALL PRODUCTS
======================================================= */

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProductRow[]).map(mapRowToProduct);
}

/* =======================================================
   GET PRODUCT BY ID
======================================================= */

export async function getProductById(
  id: string
): Promise<Product> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToProduct(data as ProductRow);
}

/* =======================================================
   CREATE PRODUCT
======================================================= */

export async function createProduct(
  product: Product
): Promise<Product> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(mapProductToRow(product))
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToProduct(data as ProductRow);
}

/* =======================================================
   UPDATE PRODUCT
======================================================= */

export async function updateProduct(
  id: string,
  product: Partial<Product>
): Promise<Product> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(mapProductToRow(product))
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToProduct(data as ProductRow);
}

/* =======================================================
   DELETE PRODUCT
======================================================= */

export async function deleteProduct(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}