export const angleColours = [['teal','Teal','#087f78'],['blue','Blue','#2d639f'],['purple','Purple','#704a99'],['amber','Amber','#955a13'],['rose','Rose','#a13f64'],['slate','Slate','#536879'],['olive','Olive','#5b702b'],['coral','Coral','#ad5238']] as const;

export const filterLabels: Record<string,string> = {
  course:'Course',
  raceType:'Race type',
  signal:'Signal',
  courseForm:'Course / distance',
  ltoResult:'LTO result',
  jockey:'Jockey',
  jockeySr:'Jockey 30-day SR',
  marketPosition:'Market position',
  sort:'Sort by',
};

const signalLabels: Record<string,string> = {all:'All signals',upgrade:'Jockey upgrades',claimer:'New claimers'};
const courseFormLabels: Record<string,string> = {all:'All records',C:'Course winner (C)',D:'Distance winner (D)',CD:'Course & distance (CD)'};
const ltoLabels: Record<string,string> = {all:'All LTO results',winner:'LTO winner',placed:'LTO placed'};
const marketLabels: Record<string,string> = {all:'All market positions',favourite:'Favourite',top3:'Top 3 in betting',midfield:'Midfield',outsider:'Outsider'};
const sortLabels: Record<string,string> = {card:'Racecard order',time_asc:'Time · earliest first',time_desc:'Time · latest first',odds_asc:'Odds · shortest first',odds_desc:'Odds · longest first',sr_desc:'Jockey SR · highest first',sr_asc:'Jockey SR · lowest first'};

export function savedFilters(values:{course:string;raceType:string;signal:string;courseForm:string;ltoResult:string;jockey:string;jockeySr:string;marketPosition:string;sort:string}) {
  return {
    course: values.course === 'all' ? 'All courses' : values.course,
    raceType: values.raceType === 'all' ? 'All race types' : values.raceType,
    signal: signalLabels[values.signal] ?? 'All signals',
    courseForm: courseFormLabels[values.courseForm] ?? 'All records',
    ltoResult: ltoLabels[values.ltoResult] ?? 'All LTO results',
    jockey: values.jockey === 'all' ? 'All jockeys' : values.jockey,
    jockeySr: values.jockeySr === 'all' ? 'All strike rates' : `${values.jockeySr}%+`,
    marketPosition: marketLabels[values.marketPosition] ?? 'All market positions',
    sort: sortLabels[values.sort] ?? 'Racecard order',
  };
}
