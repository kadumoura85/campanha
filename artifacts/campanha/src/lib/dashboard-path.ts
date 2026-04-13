export function getDashboardPath(tipo?: string): string {
  if (tipo === "vereador" || tipo === "super_admin") return "/dashboard/vereador";
  if (tipo === "coordenador_geral") return "/dashboard/coordenador-geral";
  if (tipo === "coordenador_regional") return "/dashboard/coordenador";
  return "/dashboard/lider";
}
