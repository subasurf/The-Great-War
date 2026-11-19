// ================= DATA =================
const MAP_W = 1400, MAP_H = 1000;
const projX = lon => (lon + 11) * 25;
const projY = lat => (62 - lat) * 34.5;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DIV_MEN = 15; // thousand men per division

// id: name, adj, color, major, qual, fleet, ws, mpPool(k men), mun, money, empire IC, foodNeed, techs, aggression
const NATIONS = {
  GER:{name:'German Empire',short:'Germany',adj:'German',color:'#6b7079',major:1,qual:1.2,fleet:20,ws:82,mp:1600,mun:160,money:160,empire:0,food:0.22,techs:['heavyArt','mg','recon','uboats','railLog'],aggr:1.35,mob:1.15,
    blurb:'The industrial colossus of Europe, caught between France and Russia. Strike fast in the West before the Russian steamroller arrives, or risk a war of attrition under the British blockade.'},
  AUH:{name:'Austria-Hungary',short:'Austria-Hungary',adj:'Austro-Hungarian',color:'#cfae55',major:1,qual:0.85,fleet:6,ws:66,mp:1100,mun:90,money:110,empire:0,food:0.04,techs:['heavyArt'],aggr:1.45,mob:0.9,
    blurb:'A creaking multinational empire bent on punishing Serbia. Fight on three fronts with a fragile army, and pray Germany comes to your rescue in Galicia.'},
  OTT:{name:'Ottoman Empire',short:'Ottoman Empire',adj:'Ottoman',color:'#a2865a',major:1,qual:0.85,fleet:2,ws:56,mp:500,mun:40,money:60,empire:0,food:0.05,techs:[],aggr:1.6,mob:0.8,
    blurb:'The "sick man of Europe" guards the Dardanelles, Russia\'s lifeline to the world. Neutral for now, courted by Berlin.'},
  BUL:{name:'Kingdom of Bulgaria',short:'Bulgaria',adj:'Bulgarian',color:'#7c8c4c',major:0,qual:0.95,fleet:0,ws:60,mp:300,mun:30,money:40,empire:0,food:0,techs:[],aggr:1.4,mob:1.0,
    blurb:'Humiliated in the Second Balkan War and hungry for Macedonia. Neutral, but leaning towards whoever promises the most.'},
  FRA:{name:'French Republic',short:'France',adj:'French',color:'#5170a8',major:1,qual:1.0,fleet:12,ws:82,mp:1300,mun:120,money:150,empire:6,food:0.1,techs:['recon'],aggr:1.3,mob:1.1,
    blurb:'Bound to Russia, burning to recover Alsace-Lorraine. You must survive the German onslaught, then bleed for every yard of the Western Front.'},
  GBR:{name:'United Kingdom',short:'Britain',adj:'British',color:'#b04c44',major:1,qual:1.1,fleet:32,ws:76,mp:350,mun:90,money:220,empire:10,food:0.55,techs:['dreadnought','recon'],aggr:1.55,mob:0.6,
    blurb:'Master of the seas with a tiny professional army. Blockade Germany, finance your allies, and build a mass army from scratch.'},
  RUS:{name:'Russian Empire',short:'Russia',adj:'Russian',color:'#4e8a5c',major:1,qual:0.76,fleet:8,ws:72,mp:2600,mun:90,money:120,empire:0,food:-0.1,techs:[],aggr:1.3,mob:0.75,
    blurb:'The steamroller: vast manpower, weak industry, shaky government. Strike East Prussia and Galicia before your munitions and your people give out.'},
  ITA:{name:'Kingdom of Italy',short:'Italy',adj:'Italian',color:'#3f988a',major:1,qual:0.85,fleet:8,ws:58,mp:700,mun:60,money:90,empire:0,food:0.18,techs:[],aggr:1.25,mob:1.0,
    blurb:'Nominally allied to Vienna, but Trieste and Trentino are Austrian. Sell your sword to the highest bidder, then fight up the Alps.'},
  SRB:{name:'Kingdom of Serbia',short:'Serbia',adj:'Serbian',color:'#8f4a68',major:0,qual:1.0,fleet:0,ws:88,mp:250,mun:25,money:30,empire:0,food:0,techs:[],aggr:1.5,mob:1.2,
    blurb:'Battle-hardened from the Balkan Wars and the spark of the war. Survive the Austrian punitive expedition.'},
  BEL:{name:'Kingdom of Belgium',short:'Belgium',adj:'Belgian',color:'#d7893a',major:0,qual:0.9,fleet:0,ws:86,mp:150,mun:25,money:40,empire:1,food:0.4,techs:[],aggr:1.8,mob:1.0,
    blurb:'Neutral by treaty, standing directly in the path of the Schlieffen Plan. Hold the forts of Liège and Antwerp.'},
  MNE:{name:'Montenegro',short:'Montenegro',adj:'Montenegrin',color:'#a56c8b',major:0,qual:0.9,fleet:0,ws:80,mp:40,mun:5,money:8,empire:0,food:0,techs:[],aggr:1.6,mob:1.0},
  ROM:{name:'Kingdom of Romania',short:'Romania',adj:'Romanian',color:'#b9755a',major:0,qual:0.75,fleet:0,ws:62,mp:500,mun:30,money:50,empire:0,food:-0.1,techs:[],aggr:1.3,mob:1.0,
    blurb:'Oil and grain, coveting Transylvania. Neutral and waiting to see who is winning.'},
  GRE:{name:'Kingdom of Greece',short:'Greece',adj:'Greek',color:'#86b0d4',major:0,qual:0.8,fleet:2,ws:52,mp:250,mun:20,money:40,empire:0,food:0.1,techs:[],aggr:1.5,mob:1.0},
  USA:{name:'United States',short:'USA',adj:'American',color:'#8a9a6c',major:1,qual:0.95,fleet:16,ws:72,mp:1200,mun:80,money:300,empire:0,food:-0.3,techs:['mg','recon'],aggr:1.3,mob:1.0,offmap:true},
  NED:{name:'Netherlands',short:'Netherlands',adj:'Dutch',color:'#e2a35e',major:0,qual:0.8,fleet:1,ws:60,mp:150,mun:15,money:60,empire:2,food:0.1,techs:[],aggr:2,mob:1},
  LUX:{name:'Luxembourg',short:'Luxembourg',adj:'Luxembourgish',color:'#c4a684',major:0,qual:0.5,fleet:0,ws:60,mp:5,mun:0,money:5,empire:0,food:0,techs:[],aggr:2,mob:1},
  SUI:{name:'Switzerland',short:'Switzerland',adj:'Swiss',color:'#c98486',major:0,qual:0.9,fleet:0,ws:70,mp:150,mun:20,money:60,empire:0,food:0.1,techs:[],aggr:2,mob:1},
  DEN:{name:'Denmark',short:'Denmark',adj:'Danish',color:'#c87c6c',major:0,qual:0.8,fleet:0,ws:60,mp:60,mun:8,money:40,empire:0,food:-0.2,techs:[],aggr:2,mob:1},
  NOR:{name:'Norway',short:'Norway',adj:'Norwegian',color:'#9b7db1',major:0,qual:0.8,fleet:0,ws:60,mp:50,mun:5,money:30,empire:0,food:0.1,techs:[],aggr:2,mob:1},
  SWE:{name:'Sweden',short:'Sweden',adj:'Swedish',color:'#5d9cc0',major:0,qual:0.9,fleet:2,ws:60,mp:200,mun:20,money:60,empire:0,food:0.05,techs:[],aggr:2,mob:1},
  ESP:{name:'Spain',short:'Spain',adj:'Spanish',color:'#d7c27e',major:0,qual:0.75,fleet:2,ws:60,mp:400,mun:20,money:60,empire:0,food:0,techs:[],aggr:2,mob:1},
  POR:{name:'Portugal',short:'Portugal',adj:'Portuguese',color:'#93b36c',major:0,qual:0.7,fleet:0,ws:55,mp:100,mun:8,money:20,empire:1,food:0.1,techs:[],aggr:2,mob:1},
  ALB:{name:'Albania',short:'Albania',adj:'Albanian',color:'#b29c7c',major:0,qual:0.6,fleet:0,ws:50,mp:20,mun:2,money:5,empire:0,food:0,techs:[],aggr:2,mob:1},
};
const PLAYABLE = ['GER','FRA','GBR','RUS','AUH','ITA','OTT','SRB','BUL','ROM','BEL'];

// [key, name, lon, lat, owner, industry, manpower(M pop), flags]
// flags: C capital, F1-3 fortress, m mountain, h hills, w marsh/forest
const PROV_DATA = [
 // Britain & Ireland
 ['lon','London',-0.1,51.5,'GBR',5,7,'C'],['ang','East Anglia',0.9,52.6,'GBR',1,1.5,''],['bir','Birmingham',-1.9,52.5,'GBR',4,4,''],
 ['man','Manchester',-2.4,53.5,'GBR',4,5,''],['yor','Yorkshire',-1.2,54.0,'GBR',3,3.5,''],['nwc','Newcastle',-1.9,55.2,'GBR',2,2,''],
 ['gla','Glasgow',-4.1,55.9,'GBR',3,3,''],['hig','Highlands',-4.4,57.5,'GBR',0,0.8,'h'],['wal','Wales',-3.7,52.1,'GBR',2,2.2,'h'],
 ['dev','Devon',-3.9,50.6,'GBR',1,1.5,''],['pts','Portsmouth',-1.2,50.95,'GBR',1,1.6,''],['dub','Dublin',-6.6,53.3,'GBR',1,1.6,''],
 ['mun2','Munster',-8.6,52.1,'GBR',0,1.2,''],['uls','Ulster',-6.6,54.6,'GBR',2,1.2,''],['cnn','Connacht',-9.0,53.6,'GBR',0,0.7,''],
 ['cyp','Cyprus',33.2,35.1,'GBR',0,0.3,''],
 // France
 ['par','Paris',2.35,48.85,'FRA',5,4.5,'C F1'],['lil','Lille',3.1,50.35,'FRA',3,2.5,''],['ami','Amiens',2.2,49.9,'FRA',1,1.2,''],
 ['rou','Rouen',1.0,49.4,'FRA',2,1.2,''],['nor','Normandy',-0.6,49.0,'FRA',0,1,''],['brt','Brittany',-3.8,48.2,'FRA',0,2.5,''],
 ['nan','Nantes',-1.4,47.3,'FRA',1,1.8,''],['orl','Orléans',1.8,47.8,'FRA',0,1.4,''],['rei','Reims',4.0,49.3,'FRA',1,1,''],
 ['sed','Sedan',4.95,49.75,'FRA',1,0.6,'h'],['ver','Verdun',5.35,49.15,'FRA',0,0.5,'F3 h'],['nac','Nancy',6.1,48.55,'FRA',1,0.9,'F2'],
 ['bfo','Belfort',6.85,47.7,'FRA',0,0.4,'F2 h'],['try','Troyes',4.1,48.25,'FRA',0,0.8,''],['dij','Dijon',4.9,47.2,'FRA',0,1.2,''],
 ['lyo','Lyon',4.8,45.8,'FRA',3,2,''],['grn2','Grenoble',6.0,45.0,'FRA',1,0.8,'m'],['mar','Marseille',5.3,43.6,'FRA',2,1.8,''],
 ['tls','Toulouse',1.4,43.7,'FRA',1,1.8,''],['bdx','Bordeaux',-0.5,44.8,'FRA',1,2,''],['lim','Limoges',1.3,45.9,'FRA',0,1.4,''],
 ['cle','Clermont',3.1,45.6,'FRA',1,1.2,'h'],['cor','Corsica',9.05,42.1,'FRA',0,0.3,'m'],['alg','Algiers',3.0,36.3,'FRA',0,1.5,''],
 ['ora','Oran',-0.6,35.2,'FRA',0,1,''],['cnt','Constantine',6.6,35.9,'FRA',0,1,''],['tun','Tunis',10.0,36.2,'FRA',0,1,''],
 ['fez','Morocco',-5.5,33.8,'FRA',0,1.5,''],
 // Low countries, Switzerland
 ['fla','Flanders',3.35,51.15,'BEL',1,1.8,'w'],['anw','Antwerp',4.65,51.35,'BEL',2,1.5,'F2'],['bru','Brussels',4.25,50.7,'BEL',2,2,'C'],
 ['lie','Liège',5.65,50.5,'BEL',2,1.2,'F2 h'],['lux','Luxembourg',6.1,49.75,'LUX',1,0.3,'C h'],
 ['ams','Amsterdam',4.85,52.4,'NED',2,3,'C'],['grg','Groningen',6.4,53.1,'NED',0,1,'w'],['bra','Brabant',5.6,51.7,'NED',1,2,''],
 ['brn','Bern',7.4,46.9,'SUI',1,2,'C m'],['zur','Zürich',8.9,47.3,'SUI',1,1.8,'m'],
 // Scandinavia
 ['jut','Jutland',9.2,56.1,'DEN',0,1.3,''],['cop','Copenhagen',12.1,55.5,'DEN',1,1.5,'C'],
 ['chr','Christiania',10.8,60.0,'NOR',1,1.2,'C h'],['brg','Bergen',6.0,60.7,'NOR',0,0.7,'m'],['krs','Kristiansand',8.0,58.5,'NOR',0,0.5,'h'],
 ['sto','Stockholm',17.8,59.4,'SWE',1,2,'C'],['got','Gothenburg',12.4,58.1,'SWE',1,1.5,''],['sma','Småland',14.8,56.9,'SWE',0,1.5,''],['dal','Dalarna',15.0,61.0,'SWE',1,0.8,'h'],
 // Iberia
 ['mad','Madrid',-3.7,40.4,'ESP',1,3,'C'],['bcn','Barcelona',2.0,41.6,'ESP',2,2.5,''],['zar','Aragon',-0.9,41.7,'ESP',0,1,'h'],
 ['bil','Bilbao',-2.9,43.1,'ESP',1,1.5,'h'],['glc','Galicia',-7.9,42.7,'ESP',0,2,'h'],['val','Valencia',-0.6,39.3,'ESP',0,2,''],
 ['sev','Seville',-5.9,37.5,'ESP',0,2.5,''],['gra','Granada',-3.3,37.3,'ESP',0,1.5,'m'],['ext','Extremadura',-6.2,39.3,'ESP',0,1,''],
 ['lis','Lisbon',-8.6,38.9,'POR',1,3,'C'],['opo','Porto',-8.3,41.3,'POR',0,2.5,''],
 // Germany
 ['ber','Berlin',13.4,52.5,'GER',5,5,'C'],['ham','Hamburg',10.0,53.55,'GER',3,2.5,''],['kie','Kiel',10.1,54.4,'GER',1,1.2,''],
 ['brm','Bremen',8.7,53.0,'GER',2,1.5,''],['han','Hanover',9.8,52.3,'GER',2,2.5,''],['ruh','Ruhr',7.4,51.5,'GER',6,4,''],
 ['col','Cologne',6.8,50.85,'GER',3,2.5,''],['pfa','Pfalz',7.7,49.6,'GER',1,1.5,'h'],['met','Metz',6.45,49.1,'GER',2,1,'F3'],
 ['str','Strasbourg',7.6,48.5,'GER',1,1.5,'F2'],['fra','Frankfurt',8.8,50.15,'GER',2,2.5,''],['kas','Kassel',9.6,51.3,'GER',1,1.5,'h'],
 ['stu','Stuttgart',9.2,48.75,'GER',2,2.5,''],['mnc','Munich',11.6,48.1,'GER',2,3,''],['nur','Nuremberg',11.1,49.5,'GER',2,2,''],
 ['mag','Magdeburg',11.6,52.1,'GER',2,2,''],['lei','Leipzig',12.4,51.3,'GER',4,3,''],['dre','Dresden',13.8,51.0,'GER',3,2.5,''],
 ['mec','Mecklenburg',12.0,53.75,'GER',0,1,''],['stt','Stettin',14.6,53.4,'GER',1,1.5,''],['pom','Pomerania',16.4,54.0,'GER',0,1,''],
 ['bsl','Breslau',17.0,51.1,'GER',2,2.5,''],['opp','Upper Silesia',18.6,50.4,'GER',4,2,''],['pos','Posen',16.9,52.4,'GER',1,2,'F1'],
 ['tho','Thorn',18.6,53.0,'GER',0,1.2,'F1'],['dan','Danzig',18.6,54.3,'GER',1,1.2,''],['kon','Königsberg',20.5,54.7,'GER',1,1.5,'F2'],
 ['mas','Masuria',21.2,53.75,'GER',0,0.8,'w'],
 // Austria-Hungary
 ['vie','Vienna',16.4,48.2,'AUH',4,3,'C'],['brx','Brünn',16.6,49.3,'AUH',2,2,''],['pra','Prague',14.4,50.1,'AUH',4,3.5,''],
 ['slz','Salzburg',13.4,47.8,'AUH',0,1,'m'],['inn','Tyrol',11.3,47.3,'AUH',0,0.8,'m'],['tre','Trentino',11.2,46.15,'AUH',0,0.4,'m F2'],
 ['grz','Graz',15.4,47.0,'AUH',1,1.5,'h'],['trs','Trieste',14.1,45.7,'AUH',2,1,'h'],['zag','Zagreb',16.0,45.7,'AUH',1,2,''],
 ['dal2','Dalmatia',16.6,43.6,'AUH',0,0.6,'m'],['sjv','Sarajevo',18.3,44.0,'AUH',0,1.8,'m'],['bud','Budapest',19.0,47.5,'AUH',4,3.5,''],
 ['tem','Temesvár',21.2,45.75,'AUH',1,1.5,''],['deb','Debrecen',21.6,47.5,'AUH',0,1.5,''],['ksa','Kassa',21.2,48.75,'AUH',1,1.2,'h'],
 ['trn','Transylvania',23.6,46.8,'AUH',1,2,'m'],['krn','Kronstadt',25.6,45.7,'AUH',0,0.8,'m'],['kra','Kraków',19.9,50.05,'AUH',2,1.8,'F2'],
 ['prz','Przemyśl',22.8,49.75,'AUH',0,1.2,'F3 h'],['lem','Lemberg',24.1,49.85,'AUH',1,2,''],['cze','Czernowitz',25.9,48.3,'AUH',0,1,'h'],
 // Italy
 ['rom','Rome',12.6,41.9,'ITA',1,2.5,'C'],['mil','Milan',9.3,45.5,'ITA',4,3.5,''],['tur','Turin',7.6,45.0,'ITA',3,2.5,'h'],
 ['gen','Genoa',9.0,44.45,'ITA',2,1.5,'h'],['vnz','Venetia',11.9,45.35,'ITA',1,3,''],['udi','Friuli',12.9,46.25,'ITA',0,0.8,'h'],
 ['bol','Bologna',11.3,44.55,'ITA',1,2.5,''],['tus','Tuscany',11.1,43.4,'ITA',1,2.5,'h'],['anc','Ancona',13.2,43.3,'ITA',0,1.2,'h'],
 ['nap','Naples',14.6,40.9,'ITA',1,3,''],['apu','Apulia',16.6,41.0,'ITA',0,2,''],['cal','Calabria',16.3,39.0,'ITA',0,1.5,'m'],
 ['sic','Sicily',14.1,37.5,'ITA',0,3.5,'h'],['srd','Sardinia',9.0,40.0,'ITA',0,0.8,'h'],['tri','Tripolitania',13.2,32.7,'ITA',0,0.5,''],
 // Balkans
 ['bgd','Belgrade',20.5,44.6,'SRB',1,1.6,'C'],['nis','Niš',21.9,43.3,'SRB',0,1.4,'h'],['sko','Skopje',21.4,42.0,'SRB',0,1,'m'],
 ['mon','Monastir',21.3,41.0,'SRB',0,0.6,'m'],['cet','Cetinje',19.1,42.6,'MNE',0,0.4,'C m'],['tir','Albania',19.9,41.2,'ALB',0,0.8,'C m'],
 ['ath','Athens',23.6,38.2,'GRE',1,1.5,'C'],['slk','Salonika',22.9,40.65,'GRE',1,1,''],['the','Thessaly',21.9,39.5,'GRE',0,1,'h'],
 ['pel','Morea',22.1,37.4,'GRE',0,1,'m'],['cre','Crete',24.8,35.25,'GRE',0,0.4,'m'],['epi','Epirus',20.8,39.7,'GRE',0,0.6,'m'],
 ['sof','Sofia',23.3,42.7,'BUL',1,1.8,'C m'],['var','Varna',27.6,43.2,'BUL',0,1.2,''],['plo','Plovdiv',24.9,42.1,'BUL',0,1.5,'h'],
 ['tar','Tarnovo',25.6,43.1,'BUL',0,1,'h'],
 ['buc','Bucharest',26.1,44.45,'ROM',2,2.5,'C'],['cra','Craiova',23.8,44.3,'ROM',0,2,''],['mol','Moldavia',27.3,47.0,'ROM',0,2.5,''],
 ['dob','Dobruja',28.4,44.2,'ROM',0,0.6,''],
 // Russia
 ['stp','Petrograd',30.3,59.9,'RUS',4,3,'C'],['hel','Helsingfors',25.0,60.9,'RUS',1,2,''],['tam','Tampere',25.8,62.3,'RUS',0,1,''],
 ['krl','Karelia',33.0,61.5,'RUS',0,0.6,'w'],['nov','Novgorod',31.5,58.4,'RUS',0,1.5,'w'],['rev','Reval',25.3,59.0,'RUS',0,1,''],
 ['rig','Riga',24.2,56.95,'RUS',2,1.5,''],['crl','Courland',22.0,56.7,'RUS',0,0.8,''],['psk','Pskov',28.4,57.8,'RUS',0,1.5,''],
 ['dvi','Dvinsk',26.5,55.9,'RUS',0,1.5,''],['kov','Kovno',23.9,54.9,'RUS',0,1.5,'F2'],['vil','Vilna',25.4,54.6,'RUS',1,2,''],
 ['grd','Grodno',23.9,53.6,'RUS',0,1.5,'F1'],['lom','Łomża',21.9,53.15,'RUS',0,1.2,'w'],['war','Warsaw',21.0,52.25,'RUS',3,3,'F2'],
 ['lod','Łódź',19.5,51.75,'RUS',2,2,''],['klc','Kielce',20.6,50.9,'RUS',0,1.5,'h'],['lub','Lublin',22.6,51.25,'RUS',0,2,''],
 ['brl','Brest-Litovsk',23.8,52.1,'RUS',0,1,'F2'],['pin','Pinsk',26.1,52.1,'RUS',0,1,'w'],['min','Minsk',27.6,53.9,'RUS',1,2,''],
 ['vit','Vitebsk',30.2,55.2,'RUS',0,1.5,''],['smo','Smolensk',32.1,54.8,'RUS',0,2,''],['gom','Gomel',31.0,52.4,'RUS',0,1.8,'w'],
 ['rov','Rovno',26.3,50.6,'RUS',0,2,''],['zhi','Zhitomir',28.7,50.25,'RUS',0,2,''],['pod','Podolia',27.2,48.9,'RUS',0,2.5,''],
 ['kiv','Kiev',30.5,50.45,'RUS',2,3,''],['kis','Bessarabia',28.8,47.0,'RUS',0,2,''],['ode','Odessa',30.7,46.5,'RUS',2,2,''],
 ['pol','Poltava',34.0,49.6,'RUS',0,2.5,''],['kha','Kharkov',36.3,50.1,'RUS',2,2.5,''],['eka','Ekaterinoslav',35.0,48.2,'RUS',3,2.5,''],
 ['crm','Crimea',34.0,44.9,'RUS',0,1,''],['tav','Tauride',34.6,46.8,'RUS',0,1.2,''],['ros','Rostov',39.7,47.3,'RUS',1,2,''],
 ['kub','Kuban',39.3,45.0,'RUS',0,2,''],['sta','Stavropol',42.5,45.0,'RUS',0,1.5,''],['geo','Georgia',42.8,42.2,'RUS',0,2,'m'],
 ['kar','Kars',43.2,40.6,'RUS',0,0.8,'m F2'],['kur','Kursk',36.2,51.8,'RUS',0,2.5,''],['ore','Orel',36.0,53.1,'RUS',0,2,''],
 ['kal','Kaluga',36.0,54.6,'RUS',0,2,''],['mos','Moscow',37.7,55.75,'RUS',4,4,''],['tve','Tver',35.5,57.0,'RUS',1,2,''],
 ['yar','Yaroslavl',40.0,57.7,'RUS',1,2,''],['vol','Vologda',40.0,59.6,'RUS',0,1,'w'],['niz','Nizhny Novgorod',44.0,56.3,'RUS',1,2,''],
 ['tmb','Tambov',41.5,52.7,'RUS',0,2.5,''],['vor','Voronezh',39.3,51.4,'RUS',0,2.5,''],['srt','Saratov',45.5,51.5,'RUS',0,2,''],
 ['tsa','Tsaritsyn',44.5,48.7,'RUS',0,1.5,''],['rya','Ryazan',40.3,54.4,'RUS',0,2,''],
 // Ottoman Empire
 ['con','Constantinople',28.9,41.1,'OTT',3,2,'C F2'],['edi','Edirne',26.6,41.7,'OTT',0,1,'F2'],['gpl','Gallipoli',26.4,40.3,'OTT',0,0.3,'h F2'],
 ['bur','Bursa',29.3,40.0,'OTT',0,1.2,'h'],['smy','Smyrna',27.6,38.4,'OTT',1,1.5,''],['aty','Antalya',30.7,37.2,'OTT',0,0.6,'m'],
 ['kny','Konya',32.5,37.9,'OTT',0,1,''],['ank','Ankara',32.9,39.9,'OTT',0,1.2,''],['kst','Kastamonu',33.8,41.3,'OTT',0,0.8,'m'],
 ['sam','Samsun',36.3,41.0,'OTT',0,1,'h'],['siv','Sivas',37.0,39.6,'OTT',0,1,'h'],['trb','Trebizond',39.7,40.8,'OTT',0,1,'m'],
 ['erz','Erzurum',41.3,39.9,'OTT',0,0.8,'m F2'],['van','Van',43.4,38.5,'OTT',0,0.6,'m'],['dyb','Diyarbakır',40.2,37.9,'OTT',0,0.8,'h'],
 ['ada','Adana',35.3,37.0,'OTT',0,1,''],['alp','Aleppo',37.2,36.2,'OTT',0,1.2,''],['msl','Mosul',43.1,36.3,'OTT',0,0.8,''],
 ['bag','Baghdad',44.4,33.5,'OTT',0,1.2,''],['dam','Damascus',36.3,33.6,'OTT',0,1.5,''],
];

// [key, name, lon, lat, region]  region: open | baltic | black
const SEA_DATA = [
 ['s_nwg','Norwegian Sea',2.5,62.4,'open'],['s_nwg2','Norwegian Sea',-4,62,'open'],['s_natl','North Atlantic',-9,59.5,'open'],
 ['s_pen','Pentland Firth',-3.5,59.4,'open'],['s_heb','Hebrides',-7.2,57.2,'open'],['s_nch','North Channel',-5.4,55.3,'open'],
 ['s_iri','Irish Sea',-5.0,53.7,'open'],['s_atl1','Atlantic',-11.0,55.0,'open'],['s_atl2','Atlantic',-11.5,51.5,'open'],
 ['s_cel','Celtic Sea',-6.5,50.4,'open'],['s_iro','Iroise Sea',-6.2,48.3,'open'],['s_atl3','Atlantic',-10.5,47,'open'],
 ['s_bis','Bay of Biscay',-4.5,45.5,'open'],['s_bis2','Bay of Biscay',-6.5,44.2,'open'],['s_bis3','Bay of Biscay',-2.5,44.4,'open'],
 ['s_atl4','Atlantic',-11,43,'open'],['s_atl5','Atlantic',-11,39,'open'],['s_atl6','Atlantic',-10,36,'open'],['s_atl7','Atlantic',-9,33.5,'open'],
 ['s_ch1','English Channel',-3.0,49.8,'open'],['s_ch2','English Channel',0.2,50.2,'open'],['s_dov','Strait of Dover',1.7,51.25,'open'],
 ['s_nor1','North Sea',2.6,52.9,'open'],['s_nor2','North Sea',1.8,55.0,'open'],['s_nor3','North Sea',4.5,56.0,'open'],
 ['s_nor4','North Sea',0.0,57.8,'open'],['s_nor5','North Sea',3.0,59.3,'open'],['s_nor6','North Sea',6.5,57.2,'open'],['s_nor7','North Sea',-0.3,56.0,'open'],
 ['s_hel','Heligoland Bight',7.4,54.3,'open'],['s_ska','Skagerrak',9.8,57.8,'open'],['s_kat','Kattegat',11.3,56.9,'open'],
 ['s_bal1','Western Baltic',11.8,54.6,'baltic'],['s_bal2','Baltic Sea',14.6,55.0,'baltic'],['s_bal3','Baltic Sea',17.5,55.4,'baltic'],
 ['s_bal4','Baltic Sea',19.5,57.3,'baltic'],['s_rig','Gulf of Riga',23.3,57.9,'baltic'],['s_fin1','Gulf of Finland',24.0,59.9,'baltic'],
 ['s_fin2','Gulf of Finland',27.8,60.0,'baltic'],['s_alnd','Sea of Åland',20.0,60.2,'baltic'],['s_both','Gulf of Bothnia',20.5,62.0,'baltic'],
 ['s_alb','Alboran Sea',-3.0,36.1,'open'],['s_blr','Balearic Sea',2.0,39.4,'open'],['s_alg','Algerian Sea',4.0,37.8,'open'],
 ['s_lio','Gulf of Lion',4.6,42.4,'open'],['s_sar','Sardinian Sea',6.8,40.0,'open'],['s_lig','Ligurian Sea',8.3,43.5,'open'],
 ['s_tun','Gulf of Tunis',9.0,37.9,'open'],['s_tyr1','Tyrrhenian Sea',11.5,41.0,'open'],['s_tyr2','Tyrrhenian Sea',12.4,39.0,'open'],
 ['s_tyr3','Tyrrhenian Sea',14.6,39.4,'open'],['s_sic','Strait of Sicily',11.8,36.6,'open'],['s_ion1','Ionian Sea',17.8,38.0,'open'],
 ['s_ion2','Ionian Sea',20.0,36.6,'open'],['s_ion3','Ionian Sea',16.5,35.0,'open'],['s_ion4','Ionian Sea',19.6,39.0,'open'],
 ['s_lib1','Libyan Sea',15.0,33.5,'open'],['s_lib2','Libyan Sea',20.5,33.6,'open'],['s_lib3','Libyan Sea',25.5,33.6,'open'],
 ['s_lev','Levantine Sea',29.5,34.4,'open'],['s_lev2','Levantine Sea',33.4,33.4,'open'],['s_lev3','Levantine Sea',31.0,35.6,'open'],
 ['s_lev4','Levantine Sea',35.2,35.0,'open'],['s_cil','Cilician Sea',33.0,36.2,'open'],
 ['s_adr1','Northern Adriatic',13.3,44.6,'open'],['s_adr2','Adriatic Sea',15.6,42.6,'open'],['s_adr3','Strait of Otranto',18.3,41.0,'open'],
 ['s_aeg1','Aegean Sea',24.9,39.6,'open'],['s_aeg2','Aegean Sea',24.7,37.0,'open'],['s_aeg3','Thracian Sea',25.0,40.8,'open'],['s_dod','Dodecanese',27.6,36.2,'open'],
 ['s_blk1','Black Sea',30.5,43.2,'black'],['s_blk2','Black Sea',31.2,45.3,'black'],['s_blk3','Black Sea',34.0,42.9,'black'],
 ['s_blk4','Black Sea',37.5,42.4,'black'],['s_blk5','Black Sea',40.4,42.6,'black'],['s_azv','Sea of Azov',36.8,46.1,'black'],
];

// extra land links across narrow straits
const EXTRA_LINKS = [['jut','cop'],['sic','cal'],['gpl','bur'],['con','bur']];

// Territorial claims, used for promises in diplomacy
const CLAIMS = {
  ITA:['tre','trs','inn','dal2','tir','smy','aty'], BUL:['sko','mon','nis','slk','dob'], ROM:['trn','krn','tem','cze','deb'],
  GRE:['smy','con','edi','tir'], SRB:['sjv','zag','dal2','tem'], OTT:['kar','geo','crm','slk'], AUH:['bgd','nis','cet','lub','pod'],
  GER:['lie','anw','bru','fla','lil','sed','crl','rig','kov','war','lod'], FRA:['met','str','pfa'], RUS:['con','gpl','lem','prz','cze','kon','mas','erz','trb'],
  GBR:['bag','msl','dam','alp'], USA:[], BEL:[], MNE:['tir','sjv'],
};

// ---------- Technologies ----------
const TECHS = [
 {id:'fieldFort',name:'Field Fortifications',cat:'Doctrine',year:1914,cost:45,req:[],desc:'+1 maximum entrenchment.',fx:{entCap:1}},
 {id:'mg',name:'Machine Gun Companies',cat:'Doctrine',year:1914,cost:50,req:[],desc:'+12% defence.',fx:{def:0.12}},
 {id:'depth',name:'Defence in Depth',cat:'Doctrine',year:1916,cost:85,req:['fieldFort'],desc:'+1 max entrenchment, +10% defence.',fx:{entCap:1,def:0.1}},
 {id:'infiltration',name:'Infiltration Tactics',cat:'Doctrine',year:1917,cost:110,req:['barrage'],desc:'Stormtroops: ignore 35% of enemy entrenchment, +10% attack.',fx:{entIgnore:0.35,atk:0.1}},
 {id:'combined',name:'Combined Arms',cat:'Doctrine',year:1918,cost:140,req:['infiltration','lightTank'],desc:'+20% attack, ignore a further 15% of entrenchment.',fx:{atk:0.2,entIgnore:0.15}},
 {id:'heavyArt',name:'Heavy Artillery',cat:'Artillery',year:1914,cost:50,req:[],desc:'+25% artillery power.',fx:{art:0.25}},
 {id:'shells',name:'Shell Production Drive',cat:'Artillery',year:1915,cost:60,req:[],desc:'+30% munitions output.',fx:{mun:0.3}},
 {id:'barrage',name:'Creeping Barrage',cat:'Artillery',year:1916,cost:90,req:['heavyArt'],desc:'+30% artillery power, ignore 10% of entrenchment.',fx:{art:0.3,entIgnore:0.1}},
 {id:'ranging',name:'Flash & Sound Ranging',cat:'Artillery',year:1917,cost:100,req:['barrage'],desc:'+20% artillery power, +5% defence.',fx:{art:0.2,def:0.05}},
 {id:'chlorine',name:'Chlorine Gas',cat:'Chemical',year:1915,cost:55,req:[],desc:'+10% attack (halved against gas masks).',fx:{gasAtk:0.1}},
 {id:'masks',name:'Gas Masks',cat:'Chemical',year:1915,cost:40,req:[],desc:'Halves enemy gas bonus.',fx:{masks:1}},
 {id:'mustard',name:'Phosgene & Mustard',cat:'Chemical',year:1916,cost:85,req:['chlorine'],desc:'+10% attack (halved against gas masks).',fx:{gasAtk:0.1}},
 {id:'recon',name:'Aerial Reconnaissance',cat:'Air',year:1914,cost:40,req:[],desc:'Air power +1.',fx:{air:1}},
 {id:'fighters',name:'Synchronised Fighters',cat:'Air',year:1915,cost:70,req:['recon'],desc:'Air power +1.',fx:{air:1}},
 {id:'groundAtk',name:'Ground-Attack Squadrons',cat:'Air',year:1917,cost:95,req:['fighters'],desc:'Air power +1, +5% attack.',fx:{air:1,atk:0.05}},
 {id:'bombers',name:'Strategic Bombers',cat:'Air',year:1917,cost:105,req:['fighters'],desc:'Air power +1. Bomb enemy industry (-4% IC).',fx:{air:1,bomb:1}},
 {id:'landships',name:'Landships',cat:'Armour',year:1916,cost:95,req:[],desc:'Unlocks tank battalions.',fx:{tanks:1}},
 {id:'lightTank',name:'Light Tanks',cat:'Armour',year:1917,cost:105,req:['landships'],desc:'+50% tank power.',fx:{tank:0.5}},
 {id:'tankDoc',name:'Tank Doctrine',cat:'Armour',year:1918,cost:115,req:['lightTank'],desc:'+40% tank power, ignore 10% of entrenchment.',fx:{tank:0.4,entIgnore:0.1}},
 {id:'massProd',name:'Mass Production',cat:'Industry',year:1914,cost:60,req:[],desc:'+12% industrial capacity.',fx:{ic:0.12}},
 {id:'railLog',name:'Railway Logistics',cat:'Industry',year:1914,cost:50,req:[],desc:'+1 rail movement, +25% reinforcement rate.',fx:{rail:1,reinf:0.25}},
 {id:'ersatz',name:'Ersatz Materials',cat:'Industry',year:1915,cost:65,req:[],desc:'Halves food & material shortages.',fx:{food:0.5}},
 {id:'totalWar',name:'Total War Economy',cat:'Industry',year:1916,cost:100,req:['massProd'],desc:'+15% IC, +15% manpower.',fx:{ic:0.15,mp:0.15}},
 {id:'women',name:'Women in Industry',cat:'Industry',year:1915,cost:70,req:[],desc:'+10% IC.',fx:{ic:0.1}},
 {id:'uboats',name:'U-Boat Fleet',cat:'Naval',year:1914,cost:60,req:[],desc:'Submarine warfare against enemy trade.',fx:{sub:1}},
 {id:'convoy',name:'Convoy System',cat:'Naval',year:1917,cost:70,req:[],desc:'Halves losses to submarine warfare.',fx:{convoy:1}},
 {id:'dreadnought',name:'Super-Dreadnoughts',cat:'Naval',year:1914,cost:70,req:[],desc:'+20% fleet strength.',fx:{fleet:0.2}},
 {id:'propaganda',name:'Propaganda Bureau',cat:'Home Front',year:1914,cost:40,req:[],desc:'+0.4 war support per month.',fx:{ws:0.4}},
 {id:'rationing',name:'Rationing',cat:'Home Front',year:1915,cost:50,req:[],desc:'Halves effects of food shortage.',fx:{food:0.5}},
];
const TECH_CATS = ['Doctrine','Artillery','Chemical','Air','Armour','Industry','Naval','Home Front'];
const TECH = Object.fromEntries(TECHS.map(t=>[t.id,t]));

const AI_TECH_PRIORITY = ['fieldFort','mg','heavyArt','railLog','massProd','shells','masks','chlorine','recon','fighters','depth','ersatz','rationing','women','barrage','totalWar','propaganda','landships','mustard','ranging','infiltration','lightTank','convoy','groundAtk','bombers','tankDoc','combined','uboats','dreadnought'];

// Starting deployments: [province, divisions, artillery]
const DEPLOY = {
  GER_W:[['col',9,3],['col',10,3],['pfa',8,3],['met',8,3],['str',7,2],['fra',6,2],['kon',7,2],['mas',5,1],['bsl',4,1],['ber',3,1],['kie',2,0]],
  GER_E:[['col',8,3],['met',8,3],['str',7,2],['pfa',6,2],['kon',8,2],['mas',8,2],['tho',8,2],['pos',7,2],['opp',7,2],['ber',3,1],['kie',2,0]],
  AUH_B:[['sjv',7,2],['tem',8,2],['zag',4,1],['kra',6,2],['prz',6,2],['lem',6,1],['vie',3,1],['trs',2,1]],
  AUH_R:[['sjv',5,1],['tem',5,1],['kra',7,2],['prz',8,2],['lem',8,2],['cze',5,1],['vie',3,1],['trs',2,1]],
  FRA_O:[['nac',9,2],['bfo',8,2],['ver',8,2],['sed',8,2],['rei',6,1],['par',4,1],['lil',3,1],['grn2',2,0],['alg',2,0]],
  FRA_D:[['ver',9,2],['nac',9,2],['sed',8,2],['lil',6,1],['bfo',6,2],['rei',6,1],['par',6,1],['grn2',2,0],['alg',2,0]],
  GBR_S:[['lil',6,2],['lon',6,1],['ang',4,1],['dub',2,0]],
  GBR_H:[['lon',10,2],['ang',4,1],['pts',2,0],['dub',2,0]],
  RUS_P:[['kov',9,2],['lom',9,2],['war',7,1],['lub',7,1],['rov',8,2],['pod',7,1],['brl',5,1],['kar',5,1],['stp',4,1],['ode',3,0]],
  RUS_G:[['kov',6,1],['lom',6,1],['war',7,1],['lub',9,2],['rov',10,2],['pod',9,2],['brl',5,1],['kar',5,1],['stp',4,1],['ode',3,0]],
  SRB:[['bgd',5,1],['nis',4,1],['sko',3,0]], MNE:[['cet',2,0]], BEL:[['lie',3,1],['anw',3,1],['bru',2,0]],
  OTT:[['con',5,1],['gpl',3,1],['erz',6,1],['dam',3,0],['bag',2,0],['smy',2,0],['edi',3,1]],
  ITA:[['udi',6,1],['vnz',6,1],['mil',4,1],['tur',3,0],['rom',3,0],['nap',2,0]],
  BUL:[['sof',6,1],['plo',4,1],['var',3,0]], ROM:[['buc',5,1],['cra',5,1],['mol',4,0]], GRE:[['slk',4,1],['ath',3,0],['the',2,0]],
  NED:[['ams',4,1],['bra',2,0]], SUI:[['brn',3,1]], DEN:[['jut',2,0]], NOR:[['chr',2,0]], SWE:[['sto',3,1]], ESP:[['mad',4,1],['bcn',2,0]], POR:[['lis',2,0]],
};

const PLANS = {
  GER:{title:'War Plan',opts:[
    {id:'W',name:'The Schlieffen Plan',desc:'Swing through neutral Belgium to encircle Paris in six weeks, then turn east. Britain will certainly enter the war.'},
    {id:'E',name:'The Eastern Deployment',desc:'Stand on the defensive behind the Rhine fortresses and crush Russia first. Belgium stays neutral and Britain may stay out — for now.'}]},
  AUH:{title:'Mobilisation Plan',opts:[
    {id:'B',name:'Plan B — Balkans first',desc:'Mass against Serbia to crush her quickly. Galicia is thinly held against Russia.'},
    {id:'R',name:'Plan R — Russia first',desc:'Hold Serbia with minimum forces and concentrate in Galicia against the Russian masses.'}]},
  FRA:{title:'Plan of Campaign',opts:[
    {id:'O',name:'Plan XVII — Offensive à outrance',desc:'Hurl the army into Alsace-Lorraine. Élan will carry the day... perhaps.'},
    {id:'D',name:'Defensive concentration',desc:'Shift weight north towards Belgium and dig in along the frontier fortresses.'}]},
  GBR:{title:'The Expeditionary Force',opts:[
    {id:'S',name:'Send the BEF to France',desc:'Six regular divisions cross the Channel at once to stand beside the French.'},
    {id:'H',name:'Hold the army at home',desc:'Keep the regulars in Britain as the cadre for a new mass army.'}]},
  RUS:{title:'Mobilisation Plan',opts:[
    {id:'P',name:'Invade East Prussia',desc:'Honour the promise to France: two armies march on Königsberg at once.'},
    {id:'G',name:'Mass against Galicia',desc:'Crush Austria-Hungary first, the weaker enemy, and seize Lemberg.'}]},
};

const ALLIANCE_START = {E:['FRA','RUS','SRB','MNE'], C:['GER','AUH']};
const LEAN = { OTT:{C:40,E:-30}, ITA:{E:25,C:0}, BUL:{C:25,E:-10}, ROM:{E:20,C:-5}, GRE:{E:15,C:-15} };
const DRIFT = { ITA:{E:3}, BUL:{C:2}, ROM:{E:1.3}, GRE:{E:1}, OTT:{C:3} };
