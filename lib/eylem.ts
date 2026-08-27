/** useActionState ile kullanılan form eylemlerinin ortak imzası. */
export type FormEylemi = (
  onceki: string | null | undefined,
  veri: FormData,
) => Promise<string | undefined>
