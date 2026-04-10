export interface CidadeComBairros {
  id: string;
  nome: string;
  uf: string;
  bairros: string[];
}

export const cidadesComBairros: CidadeComBairros[] = [
  {
    id: "duque-de-caxias-rj",
    nome: "Duque de Caxias",
    uf: "RJ",
    bairros: [
      "Bar dos Cavaleiros",
      "Centro",
      "Corte Oito",
      "Doutor Laureano",
      "Engenho do Porto",
      "Gramacho",
      "Jardim 25 de Agosto",
      "Jardim Gramacho",
      "Jardim Leal",
      "Olavo Bilac",
      "Parque Beira Mar",
      "Parque Duque",
      "Parque Lafaiete",
      "Sarapuí",
      "Vila São Luís",
      "Campos Elíseos",
      "Cidade dos Meninos",
      "Figueira",
      "Jardim Primavera",
      "Pilar",
      "Parque Fluminense",
      "Saracuruna",
      "São Bento",
      "Imbariê",
      "Jardim Anhangá",
      "Parada Angélica",
      "Parada Morabi",
      "Parque Paulista",
      "Santa Cruz da Serra",
      "Santa Lúcia",
      "Taquara",
      "Xerém",
      "Amapá",
      "Mantiquira",
      "Parque Capivari",
      "Vila Canaã",
    ],
  },
];
