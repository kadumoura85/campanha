export function getDashboardPath(tipo: string): string {
  if (tipo === "vereador" || tipo === "coordenador_geral" || tipo === "super_admin") return "/dashboard/vereador";
  if (tipo === "coordenador_regional") return "/dashboard/coordenador-regional";
  return "/dashboard/lider";
}
