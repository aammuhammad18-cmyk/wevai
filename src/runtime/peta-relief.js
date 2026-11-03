/* PETA RELIEF 3D — Jawa sebagai relief bercahaya untuk video sejarah (resep, data, batas akurasi: peta-relief.md). Satuan km;
   x ke timur, z ke selatan, y ke atas = tinggi × tegak. Murni (diuji test-peta, tanpa THREE): proyeksi, lonlat, dekode, medan,
   jalurRute. Butuh THREE: petaRelief, sungaiPeta, rutePeta, labelPeta, tempelLabel, ikutMatahariPeta.
   Butuh blok kamera (hash), terbang (jalurElang), kamera-three (camera, key, scene, W, H). Data JAWA:
   - pantai, dalam: Natural Earth 10m (domain publik) ne_10m_land + ne_10m_bathymetry_K_200, dibuat scripts/peta-data.mjs
     (Douglas–Peucker 0,5 km / 1,5 km; kuantum 0,002°);
   - gunung (Holosen) dan gunungTua (Pleistosen): [nama, lon, lat, puncak m] Global Volcanism Program, VOTW 5.4.0 (7 Ags 2026),
     doi:10.5479/si.GVP.VOTW5-2026.5.4, diambil lewat WFS 3 Nov 2026; jari kaki (km) dan opsi bentuk = perkiraan, bukan data;
   - sungai: SKEMATIS, titik kota/muara yang dilalui (NE 10m tidak memuat satu pun sungai Jawa); wilayah: bentuk tangan. */
const JAWA={
  pantai:{kotak:[103,-9.5,117,-3],q:.002,s:'yqrD90HVFjH-BpFU7BLdaIWjBMtIczBPfdnBenCMLMPkCtBTVbrBhBvBaVFRRGTHJTEFYHEhDDfbLnCpBZ_DA7FgB3FuB5CFhBQBeVO3DYZwBhBQjBcrDgBLWrBINMxBH1ESnDepSuBpBiBtBOjBPCsBXYKwCcqBSKkBCEKPW0C6CBoCbSbDdMbHVdjCFtBONQTGJSpBgBhBBrBUnC8BpCS7BFPFDNNDJOjDPnCOxETTPlBMLHZWREVNVapBStBCHDJZRJRIT2BTQMKgBFOGuBqBayBSGaRSXEfc3BgBVSGmB2C-C8CGQJ0CayBMIWAElBeVmCWaiBQsBIuGkB2DUoB6C2CUiCWYgBMiBDWXEhCGJqBXQDiBQuB4BqBDgCvBwBJ8BdaAgBWWGoEFiBRS1BOLqBHsBCoFeIsBNYauBDiBWKkBHiBPkBjBUFkBCqCYqCV0DpF-ClB6BDiBlBWLWMQJQEyBacFAWQEWFCNOAWUKXAV0BfyE9BwBE2BiBIMCaTSMEyBT-BAWNGMWEM9C0ClD0CrBiB3FgB7C6BFqBbqBPsBAqBYKJuBLiBhBUFoBIS0BSCiBNmBdyBXyGT2CQ2B6BoBhBiGbqF1BsBFsBC6EYoBqBKDKdOJwCfgCnBaDiBSoBIeM2CmDoC0EOsBGuCSsBJWeMcgBwDmByCOwBbeAIMyBxBGnB2BrEYpB-GT-BMQKyBiCaP4BJiBN0C7CuBZkCRqCH2BYWESDsD5DiCD4CU8BCqBOYE0BLUMSFuBhBqBHQKEqBUDWhBV1CkBzBKDeIIPvBPHJELSfaNajBFRNF7BGQVwCnBuBwBWGeRarBCfJ9CHTlBXHPAzCyC7BgE3B0CPsC_BkCTqBISJafOFYC6CyByDkBiETqBOWBgCRSEiBkBQI4BHkBImC8BeGgBR-BlCgBNYA-BOQF0BrB-BH6BjBOPITH_BTlBGxCpBvEtB7HCTMXEhCMHOKEmCSRC_CUnBQPwBJaR2BRkBzBBXZjBpBB3CevCAVGEQWaFkBjBgBvBUnBC_BjBXalCRrBGbczBPLQGkBJGpBNpBKpBYNNJwBHGfFXTZADaLKjBBfkBrBKVWtBDlBWXeTCfNRIxB6BVOzCepBCrFXlBVzB5BhBVrBMXQPTJBXMjBZtBJdZ7BgB7CYtCArBUVAIOpBatBCzBLjBS3FU1BazBXTGXWzBGdMJFJTBjBTFNeJGHDX1BSPPJpBOXiBRNxBWNAdNlCSFkBPIjBHZO_BAXOxDhBNchBMJkBHBdrBvBB1CiBzCSjEIXSzBOlBSAHzBYpCQhCkBdCzB0BnBG9HkElDe 4ykD39C--CAQtBG7DUpBFrBJJhChBjBb9BvCRrB9B7GGnBafyC5BSfAjBPnBhC9ClBnEThDI9BmBxCDVaTOhBIGERHpBMhBV3BSjCPHHRN_DEXkB9BChBpBhDD1GXxCFtBGzCP9BI9BB9BX_BXtDzBjCJIH4BdMvCKPUFsCLiBVWTTpBU1CsC3C0DdWdPDRMnBTxBHHbIVLQ7BAbUd9BbEP6BRNNlBLtBErBkBrFqC_BwBvBOvC0CbU7BQPMIVtBBPFRPFPGT6E3HOtCOjBPHpECHIEkBDYLStC8BNehC8B1CwBHSYULUrBuBzBUJGRezBW3CqDrBsBFQOiBJQdU7BIHQQeEgBVkB7BkBnBmBrBEVKKmBdWXCbZlB8BXKlBC1BsBlBIvBNbiCZQPLPGX8BjE0D5DqCxBU uxxD39CZJPK5DAEFUGgBDQtBsC5BOPDLzCZLGDPUjBEXFXNJpBNIaKCKHOOEUPAtBTX9B9BnDNnBThEVZtDLjDrCtFzCrQtG3FzCjFjDvBNnBORmBEsBWsCT2CHmCIsFPuB7BqCNsBCsBagElBTLNLpDLL_BO7D-BXaCUKQaQWiCkBuBEWnBjBrCvD9BV7BORUDiBSiDDaT1CRPlB_B9ClB9BjBnCZjDPxCQHqCU0CBqBdyCnDEVDhBZLlBPJ5BDNCFMFmBJSbUsBzCGZzB6BlCyBbmCpBe5BWXqBrBAPjBJJXDhBjBHTalB2BLAF_KhHfbTHjBIPVTFVGlEiDpBStBIjDP1CzBtEvEjCtBzCaNOAUcgCGgCbiGSgET-B3GArBRRGFM_KAzD9BpCZrBDjBIxCuBlCMIaPAvB9BjBRfaBMQOFc5LA 03uD_nIQRBTlBHvCAJGAeOKFQ 8uqDtyHWDCPrBGtEoB5BBFOESYY0BZ0CP i9vD5-GcHDd5DOEQqBU ylxDj-GE3BRVlBLpBIlBUNUIKSBIaIAIVOLoCHEEHAJQMOIF -6wD5uIYFqBjCIbjBnBbI1BoBRUTIyB-BSD y7wD33GCZNJ1BE7BaXPlBQlBRELeLWTVPVGlBePTIbPHbYKuB1BBHMEYmBoBLSgBKoDCwCH-CvB 8huD9yFkBlBEXHnBfTjBAJKXJZAV2BgC-BMD w1xD_pDESejBnB9GHH1BuCHeiB8C w5mD_rGA_BHjBPPRFRXLDJGUwBTQFYrBpBLDBSUYyBoBIHUS gsmD_zFSXDbHHvBgBTkBGKKA i2vDx9GapBDtB7BSFMhBEVgCYacEUF 68xDziIiBNmBbehBInB5B3CDrC1B5BnChE3B5BK3BKBKSKGIJoBRVfpBFNGhBXdANKUYUuBPGfBZTGhDNEBaHMJARNXcnCVTOfNjBqB9BEDNXFNKSMCGPKbHAlBTFRKNeRSZHPE7BgBbGLYCWEWOYUFMGMd-BAeQoBJSOIAQZWWEMfMMoEJ4BXWJ2BWgBUIkBAQgB6BkBqDmD6CiBSAeP0DZyBZ -rvDh4GwBRQNOjBbArBdlCHZXtBDRLVjBQDKTXHnBDlFWTVjBCbXhBvChBNRSXIxBD3EIjBKvBPTEHiBLOMUjBMHBJjBsBjBBLRF1JmC7CEHoBKcHIJPHGJiBIYiBG6BsB0B6BBSqCQ4EKuCLsJMwCNyEQ6DBiESiCN u1pD39CEnBZ_Baf3DZJJFRAjBJFzCHJWDkCtC-BCSTSrBNANQbAlBZV9BdjCAbhBZHdMHWMekBwBrBsBDsBNoB mnoD39CMDIPHhBOTHFHEbRTIRJNQ1BIbDHZNITLNMR4BrBmB ooyDn8IxBkBrBDjDcfYJDjB0BESQYLwBoBwBqBIGShB2BRBHKI6BXOqByCqBKIUBuBUPWD4DqB 2rvDh9GOJIRDL_BGpBQPSQQMH s-wDp6GQTHBZKZDdMZaKUSA k9wD_iIoC3BWfNrB_CxClCDLFFVRNlEvBpBbjC5CpBNHTCVORIGNUSIGRBvBFJxBTtBAnBQAQiCkBWkBEYd8BzBgBbsB1BmB9CwCjE-BnBIzDAjBM1B0BxC0DTgDEa0BGkBlBQFqBYOLwCNmF5BiBO8CAmBIqBcoCoCkBQWAqBLgBVmCNkFjCgCxB wyxDl0DUNKRLFJdVdAXSlBBZdFRXpBJLfXNZdlBPXdJcJGNHHUOiCYKEKTeDSK-BDY1BsCD-CYgCM4CsBuCYsCyBciDuCKZT5DGnB2BpCERtBPBRYzB'},
  dalam:{kotak:[103.6,-12,117.4,-4],q:.002,s:'8guD_2Lr7IAA84GuP9OoCvBAvB0BF8F5IoCnFiD_DBvDzBvBWlBuFgBoCuCrByLYyD8CzB8C2C0BKkHjEUtBH9N_E1EHfQ7B-C3DqB7CmBVkClFqBfsDa4DXoCwB4DA0F2CkElBgDnCwFHc1B5B9DAvCoBvCmDLCxBnBhCgBf8IEkCZqE-CwBE0P5CgD1BwBnCgDAqEvF2BnBwEA-EhDiECoCnCgGvB-BtBqG-CuBLqCzCoCYoCXoFgDgDAwBwB4DXyCwBmH_CwEY4FpDwJ3CoElF2GkD2X9D4CQ0DyCgG_CwEY4DvBkO5BkCUwI2FaTW7DqC9CuBZwBGiCkCmCW4H_CoCvB4DYgDvBwDS4EpEgGAyHrCoBiBHoB3C6ETuDayB4DYWXC9E-E9CgClFqCXuG2BiD0BoFXgDsBYcHoB7BoC3CeHuB6DkCuCyCUsC_G4GjJ0DrEN_EnDxKiCtCiGYgDZiCMyBoF6E2BOwD-CoEG8L4HsDU0EJ8FzC-CD0G6B2D0CYoC0BmBbiEyD0FNgGkUsnBmDqDkDwHO-CrBoHkC4DAgDwBwByCiJA_5H glnDzrK6Cea8CLuCjDGpDhBChD wqyDl-I2EkCyFAA4e1BLXhBc_ByBEApEtBtBrEmDrCWxExB5BYzC3CjBHvEoF1I2B3DlBjD1ClDB7BZLrBenEH_B_GrEjBvBC5ByBzB4GnD8CW2HpCgI0B6FzDmEF6C_B quyDpvHkBYqFLA-GpDhB_DqBtBHJlBqBvGZ7D0B_BsBOiB4B 6yyDn6F-BaA6QxClCnCvE9E_DhBlCUjC6B7B0Dd'},
  /* [nama, lon, lat, puncak m (GVP)], jari kaki km, opsi {k: lengkung profil, kawah: jari km, cekung: km, kaldera:[jari bibir, tinggi bibir, lantai, jari kerucut tengah]} */
  gunung:[['Pulosari',105.978,-6.343,1324,8],['Karang',106.05,-6.268,1768,10],['Perbakti-Gagak',106.675,-6.75,1726,6],['Salak',106.733,-6.716,2218,11],
    ['Gede-Pangrango',106.983,-6.786,3026,15],['Patuha',107.4,-7.162,2422,9],['Tangkuban Parahu',107.6,-6.77,2084,13,{k:1.3}],['Papandayan',107.7306,-7.3175,2643,9],
    ['Guntur',107.841,-7.143,2251,8],['Tampomas',107.9612,-6.7639,1690,8],['Galunggung',108.058,-7.25,2168,10],['Talagabodas',108.07,-7.208,2201,8],
    ['Ciremai',108.408,-6.895,3039,14],['Slamet',109.208,-7.242,3428,20],['Dieng',109.879,-7.2,2565,10,{k:1}],['Sundoro',109.997,-7.3014,3149,12],
    ['Sumbing',110.0747,-7.3819,3370,13],['Merbabu',110.44,-7.454,3118,12],['Merapi',110.446,-7.54,2910,13,{kawah:.5}],['Lawu',111.192,-7.625,3265,18],
    ['Kelud',112.314,-7.935,1730,11,{kawah:.7,cekung:.2}],['Kawi-Butak',112.45,-7.92,2651,12],['Arjuno-Welirang',112.575,-7.733,3343,14],['Penanggungan',112.62,-7.616,1631,6],
    ['Semeru',112.922,-8.108,3657,15],['Tengger',112.95,-7.942,2329,18,{k:1.5,kaldera:[4.6,2.65,2.15,1.4]}],['Lamongan',113.341,-7.981,1641,9],
    ['Iyang-Argapura',113.57,-7.97,3088,16,{k:1.3}],['Raung',114.056,-8.119,3260,14,{kawah:.8,cekung:.25}],['Ijen',114.242,-8.058,2769,10,{kawah:.6,cekung:.2}],
    ['Baluran',114.37,-7.85,1247,8],['Buyan-Bratan',115.133,-8.283,2244,10],['Batur',115.3775,-8.2403,1711,8],['Agung',115.508,-8.343,2997,12]],
  gunungTua:[['Tanggamus',104.675,-5.427,2079,12],['Pesawaran-Ratai',105.093,-5.505,1575,9],['Rajabasa',105.6314,-5.7803,1282,5],['Endut',106.37,-6.62,1297,7],
    ['Halimun',106.45,-6.72,1929,9],['Kendeng',106.526,-6.768,1732,7],['Halimun-Talaga',106.563,-6.846,1741,7],['Kancana',107.041,-6.897,1213,6],
    ['Sanggabuana',107.22,-6.58,1291,7],['Tilu',107.529,-7.156,2042,7],['Kancana',107.63,-7.32,2182,7],['Wayang-Windu',107.637,-7.213,2184,5],
    ['Malabar',107.639,-7.132,2307,9],['Kendang',107.709,-7.245,2594,8],['Mandalagiri',107.78,-7.4,1831,7],['Cikuray',107.86,-7.322,2784,9],
    ['Mandalawangi',107.864,-7.058,1631,7],['Canlancang',107.95,-6.958,1651,6],['Putri',107.973,-7.269,1796,5],['Sedakeling',108.03,-7.12,1676,6],
    ['Cakrabuana',108.13,-7.03,1721,8],['Sawal',108.27,-7.18,1764,9],['Ungaran',110.3455,-7.1876,2033,11],['Telomoyo',110.3998,-7.3613,1891,6],
    ['Muria',110.88,-6.62,1625,14],['Lasem',111.52,-6.68,806,7],['Wilis',111.758,-7.808,2563,17],['Pandan',111.7997,-7.4592,908,5],
    ['Selokaki',112.35,-7.83,1083,5],['Argowayang',112.43,-7.77,2198,7],['Ringgit',113.85,-7.72,1250,8],['Merbuk',114.653,-8.226,1359,8],
    ['Patas',114.817,-8.261,1390,8],['Seraja',115.654,-8.377,1142,6]],
  /* SKEMATIS, hulu → muara, [lon, lat, …] lewat kota yang dilalui; galat ± beberapa km (peta-relief.md "Batas akurasi") */
  sungai:{'Bengawan Solo':[110.9,-7.93,110.92,-7.83,110.86,-7.69,110.85,-7.57,110.95,-7.47,111.03,-7.42,111.25,-7.4,111.45,-7.4,111.55,-7.27,111.6,-7.15,
      111.75,-7.17,111.88,-7.15,112.03,-7.12,112.17,-7.11,112.35,-7.06,112.47,-6.98,112.57,-6.89],
    Brantas:[112.53,-7.76,112.52,-7.87,112.62,-7.96,112.6,-8.1,112.45,-8.16,112.3,-8.13,112.17,-8.12,111.98,-8.08,111.92,-8.02,111.99,-7.9,112.01,-7.82,
      112.06,-7.7,112.1,-7.59,112.25,-7.52,112.43,-7.46,112.57,-7.48,112.71,-7.54,112.86,-7.55],
    Citarum:[107.66,-7.21,107.75,-7.05,107.62,-6.99,107.5,-6.95,107.38,-6.91,107.3,-6.75,107.37,-6.53,107.31,-6.3,107.28,-6.15,107.15,-6.02,107.03,-5.95],
    Cimanuk:[107.9,-7.25,107.97,-7.05,108.08,-6.88,108.18,-6.75,108.25,-6.55,108.33,-6.32,108.37,-6.22],
    Citanduy:[108.35,-7.25,108.54,-7.37,108.7,-7.47,108.85,-7.68],
    Serayu:[109.92,-7.22,109.9,-7.36,109.8,-7.4,109.69,-7.4,109.55,-7.43,109.4,-7.47,109.29,-7.51,109.2,-7.58,109.12,-7.69],
    Progo:[110.08,-7.27,110.17,-7.32,110.2,-7.42,110.21,-7.52,110.22,-7.61,110.25,-7.72,110.25,-7.85,110.21,-7.98],
    Opak:[110.45,-7.6,110.48,-7.68,110.495,-7.755,110.46,-7.86,110.38,-7.95,110.3,-8.01]},
  /* bentuk tangan (bukan data): [lon, lat, jari x km, jari z km, tinggi km] — dataran tinggi, pegunungan selatan, perbukitan */
  wilayah:[[105.05,-5.45,50,40,.3],[106.2,-6.55,40,30,.25],[106.6,-6.75,35,25,.45],[107.75,-7.1,80,35,.65],[107.2,-7.25,70,18,.45],[107.9,-7.45,45,15,.4],
    [109.6,-7.18,50,15,.45],[109.6,-7.5,40,12,.35],[109.95,-7.3,25,15,.6],[111.6,-7.3,90,12,.25],[111.8,-6.9,80,12,.2],[110.75,-8.0,45,14,.4],
    [111.3,-8.1,40,14,.55],[111.75,-8.15,35,12,.55],[112.2,-8.25,40,10,.4],[112.75,-8.3,40,10,.35],[114.15,-8.0,22,16,1.2],[113.3,-7.05,70,10,.12],[115.2,-8.3,30,12,.45],[112.65,-8.0,22,18,.35],[112.55,-7.9,14,12,.4]]};   // terakhir: dataran tinggi Batu–Malang

/* proyeksi equirektangular di lintang tengah peta (galat skala ≤ 0,4 % di tepi utara/selatan Jawa) */
const PETA0={lon:110,lat:-7.3},KM_LON=111.32*Math.cos(PETA0.lat*Math.PI/180),KM_LAT=110.58;
const proyeksi=(lon,lat)=>[(lon-PETA0.lon)*KM_LON,(PETA0.lat-lat)*KM_LAT];
const lonlat=(x,z)=>[PETA0.lon+x/KM_LON,PETA0.lat-z/KM_LAT];
/* string scripts/peta-data.mjs → cincin [[lon,lat],…]: selisih kuantum q, zigzag, varint 5 bit per huruf base64url */
function dekode({q,s}){const H='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  return s.split(' ').filter(Boolean).map(t=>{const v=[];let n=0,k=1;
    for(const c of t){const d=H.indexOf(c);if(d<0)throw new Error('dekode: huruf asing '+c);n+=(d&31)*k;if(d<32){v.push(n%2?-(n+1)/2:n/2);n=0;k=1;}else k*=32;}
    const r=[];for(let i=0,x=0,y=0;i<v.length;i+=2){x+=v[i];y+=v[i+1];r.push([x*q,y*q]);}return r;});}
/* MEDAN: tinggi(x,z) km, murni & deterministik. Darat = dataran pantai + wilayah + fBm, gunung = kerucut ber-kawah & beralur di
   koordinat GVP (puncak = bibir kawah = data), digabung smooth-max; lembah sungai diukir. Laut = parameter kedalaman untuk warna:
   0 di pantai → −0,2 tepat di garis 200 m (NE) → menurun di laut dalam. */
function medan(D=JAWA,{seed=3}={}){
  const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);},smax=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k/4;},
    vn=(x,z)=>{const i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j,a=u*u*(3-2*u),b=v*v*(3-2*v),h=(p,q)=>hash(p*7919+q*104729,seed);
      return(h(i,j)*(1-a)+h(i+1,j)*a)*(1-b)+(h(i,j+1)*(1-a)+h(i+1,j+1)*a)*b;},
    fbm=(x,z)=>{let s=0,a=.5,f=1;for(let o=0;o<4;o++){s+=a*(2*vn(x*f+o*17,z*f)-1);a*=.5;f*=2.07;}return s;},
    d2=(x,z,a,b)=>{const ex=b[0]-a[0],ez=b[1]-a[1],l=ex*ex+ez*ez,t=l?Math.min(1,Math.max(0,((x-a[0])*ex+(z-a[1])*ez)/l)):0,px=x-a[0]-t*ex,pz=z-a[1]-t*ez;return px*px+pz*pz;},
    ember=(R,B,x0,z0,x1,z1)=>{const nx=Math.ceil((x1-x0)/B)+1,nz=Math.ceil((z1-z0)/B)+1,E=Array.from({length:nx*nz},()=>[]);   // ember B km: ruas dekat titik
      R.forEach((r,k)=>{const i0=Math.floor((Math.min(r[0][0],r[1][0])-x0)/B),i1=Math.floor((Math.max(r[0][0],r[1][0])-x0)/B),j0=Math.floor((Math.min(r[0][1],r[1][1])-z0)/B),j1=Math.floor((Math.max(r[0][1],r[1][1])-z0)/B);
        for(let j=Math.max(0,j0);j<=Math.min(nz-1,j1);j++)for(let i=Math.max(0,i0);i<=Math.min(nx-1,i1);i++)E[j*nx+i].push(k);});
      return(x,z)=>{const i=Math.floor((x-x0)/B),j=Math.floor((z-z0)/B);let q=Infinity,m=-1;   // terdekat di 3×3 ember: pasti tepat bila d ≤ B
        for(let b=j-1;b<=j+1;b++)for(let a=i-1;a<=i+1;a++){if(a<0||b<0||a>=nx||b>=nz)continue;for(const k of E[b*nx+a]){const e=d2(x,z,R[k][0],R[k][1]);if(e<q){q=e;m=k;}}}
        if(m<0)return[Infinity,-1,0];const[a,b]=R[m],ex=b[0]-a[0],ez=b[1]-a[1],l=ex*ex+ez*ez;
        return[Math.sqrt(q),m,l?Math.min(1,Math.max(0,((x-a[0])*ex+(z-a[1])*ez)/l)):0];};},
    /* poligon: dalam/luar ganjil-genap per baris z (titik di luar kotak data dijepit ke dalamnya), jarak ke tepi ASLI (ruas di tepi kotak
       klip diabaikan): tepat ≤ 8 km lewat ember, lebih jauh dari kisi pembantu 6 km (bilinear), dilebur 6–8 km tanpa lompatan */
    bidang=data=>{const K=data.kotak,[x0,z0]=proyeksi(K[0],K[3]),[x1,z1]=proyeksi(K[2],K[1]),e=1e-6,
        R=dekode(data).map(r=>r.map(p=>proyeksi(p[0],p[1]))),semua=R.flatMap(r=>r.map((a,i)=>[a,r[(i+1)%r.length]])),
        tepi=(a,b,k,v)=>Math.abs(a[k]-v)<e&&Math.abs(b[k]-v)<e,bukan=([a,b])=>!(tepi(a,b,0,x0)||tepi(a,b,0,x1)||tepi(a,b,1,z0)||tepi(a,b,1,z1)),asli=semua.filter(bukan),
        dekat=ember(asli,8,x0,z0,x1,z1),G=8,gx=Math.ceil((x1-x0)/G)+1,gz=Math.ceil((z1-z0)/G)+1,kisi=new Float32Array(gx*gz),
        jarang=R.flatMap(r=>{const o=[];let run=[];const tutup=()=>{const v=run.filter((_,i)=>i%3===0||i===run.length-1);for(let i=1;i<v.length;i++)o.push([v[i-1],v[i]]);run=[];};
          r.forEach((a,i)=>{const b=r[(i+1)%r.length];if(bukan([a,b])){if(!run.length)run.push(a);run.push(b);}else tutup();});tutup();return o;}),   // kisi pembantu (> 6 km): ruas ASLI dijarangkan 3× per rangkaian (tanpa tali busur memotong tepi kotak klip)
        B=5,pita=Array.from({length:Math.ceil((z1-z0)/B)+1},()=>[]);   // tepi per pita z 5 km: uji dalam/luar tidak menyapu semua ruas
      for(let j=0;j<gz;j++)for(let i=0;i<gx;i++){const x=x0+i*G,z=z0+j*G;let q=Infinity;for(const[a,b]of jarang){const v=d2(x,z,a,b);if(v<q)q=v;}kisi[j*gx+i]=Math.sqrt(q);}
      for(const r of semua)for(let k=Math.floor((Math.min(r[0][1],r[1][1])-z0)/B);k<=Math.floor((Math.max(r[0][1],r[1][1])-z0)/B);k++)if(pita[k])pita[k].push(r);
      let zc=NaN,X=[];
      const jepit=(x,z)=>[Math.min(x1-e,Math.max(x0+e,x)),Math.min(z1-e,Math.max(z0+e,z))],
        dalam=(x,z)=>{[x,z]=jepit(x,z);if(z!==zc){zc=z;X=[];for(const[a,b]of pita[Math.floor((z-z0)/B)])if((a[1]>z)!==(b[1]>z))X.push(a[0]+(z-a[1])*(b[0]-a[0])/(b[1]-a[1]));X.sort((p,q)=>p-q);}
          let lo=0,hi=X.length;while(lo<hi){const m=lo+hi>>1;X[m]<=x?lo=m+1:hi=m;}return(X.length-lo)%2===1;},
        jarak=(x,z)=>{const[cx,cz]=jepit(x,z),luar=Math.hypot(x-cx,z-cz),[d]=dekat(cx,cz);if(d<=6)return d+luar;
          const u=(cx-x0)/G,v=(cz-z0)/G,i=Math.min(gx-2,Math.floor(u)),j=Math.min(gz-2,Math.floor(v)),a=u-i,b=v-j,k=j*gx+i,
            g=Math.max(6,(kisi[k]*(1-a)+kisi[k+1]*a)*(1-b)+(kisi[k+gx]*(1-a)+kisi[k+gx+1]*a)*b);
          return(d<=8?d+(g-d)*ss(6,8,d):g)+luar;};
      return{dalam,jarak,sdf:(x,z)=>dalam(x,z)?jarak(x,z):-jarak(x,z)};},
    darat=bidang(D.pantai),laut=bidang(D.dalam),
    G=[...D.gunung.map(g=>[g,0]),...D.gunungTua.map(g=>[g,1])].map(([[nama,lon,lat,m,R,o={}],tua],i)=>{const[x,z]=proyeksi(lon,lat);
      return{nama,lon,lat,x,z,E:m/1e3,R,tua,k:tua?1.35:1.7,kawah:tua?0:.45,cekung:.12,alur:tua?.32:.22,lancip:tua?.09:.03,
        jurang:8+Math.floor(hash(i,seed+5)*7),fase:hash(i,seed+6)*6.283,...o};}),
    /* jurang radial: 8–14 per gunung, jarak tak rata dan berliuk ke kaki (sin bertumpuk), sempit ((1−|sin|)^2,5), dalamnya beda-beda
       (barranco dalam di antara alur dangkal), dalam ke kaki. Rumus SAMA dengan jurang() di shader petaRelief */
    jurang=(g,r,a)=>{const q=g.jurang*a/2+.9*Math.sin(3*a+g.fase)+.45*Math.sin(7*a+2*g.fase+2.3*r)+.5*r*Math.sin(5*a+g.fase);
      return g.alur*ss(.08,.42,r)*(1-ss(.82,1,r))*(1-Math.abs(Math.sin(q)))**2.5*(.3+.7*(.5+.5*Math.sin(.61*q+2.1*g.fase)));},
    /* kaki tak bulat: R(a) = R·(1 + ,12 sin(2a+fase) + ,06 sin(3a+2fase)) — lereng satu sisi lebih landai; sama dengan shader */
    kerucut=(g,x,z,alur=1)=>{const dx=x-g.x,dz=z-g.z,q=dx*dx+dz*dz;if(q>=g.R*g.R*1.4)return 0;const a=Math.atan2(dz,dx),R=g.R*(1+.12*Math.sin(2*a+g.fase)+.06*Math.sin(3*a+2*g.fase)),d=Math.sqrt(q);
      if(d>=R)return 0;const r0=(d-g.kawah)/(R-g.kawah),c=g.lancip,r=(Math.sqrt(r0*r0+c*c)-c)/(Math.sqrt(1+c*c)-c),f=alur?jurang(g,r,a):0;   // puncak sedikit membulat
      if(g.kaldera){const[rb,hb,lt,rk]=g.kaldera,luar=d<rb?lt+(hb-lt)*ss(rb-1.4,rb,d):hb*Math.pow(1-(d-rb)/(R-rb),g.k)*(1-f);
        return Math.max(luar,d<rk?lt+(g.E-lt)*Math.pow(1-d/rk,1.2):0);}   // dinding kaldera, lantai pasir, kerucut tengah = puncak GVP
      if(d<g.kawah)return g.E-g.cekung*(1-(d/g.kawah)**2);   // kawah: bibir = puncak GVP
      return g.E*Math.pow(1-r,g.k)*(1-f);},
    W=D.wilayah.map(([lon,lat,rx,rz,h])=>[...proyeksi(lon,lat),rx,rz,h]),
    wilayah=(x,z)=>{let s=0;for(const[cx,cz,rx,rz,h]of W){const u=(x-cx)/rx,v=(z-cz)/rz,q=u*u+v*v;if(q<9)s+=h*Math.exp(-q);}return s;},
    kasar=(x,z,dc,alur=1)=>{const w=wilayah(x,z);let h=Math.max(Math.min(.002*dc,.03),.0025*Math.min(dc,40)+(w+(.04+.15*w)*fbm(x/28,z/28))*ss(0,8,dc));
      for(const g of G){const c=kerucut(g,x,z,alur);if(c>0)h=smax(h,c*ss(0,3,dc),.06);}return h;},
    kedalaman=(x,z,dc)=>{const dd=laut.sdf(x,z);return dd>0?-.2-2.6*(1-Math.exp(-dd/45)):-.2*-dc/Math.max(1e-6,-dc-dd);},
    /* sungai: Catmull-Rom (jalurElang) per 0,8 km, ekor di laut dipotong; muka air (batas bawah ukiran) = minimum berjalan dari hulu (tak pernah naik) atas
       tanah TERENDAH di penampang (±0,3 km di hulu → ±2,4 km di hilir) — jalur skematis yang menyusur lereng tidak berjalan di atas tanggul */
    S=Object.entries(D.sungai).map(([nama,ll])=>{const T=[];for(let i=0;i<ll.length;i+=2)T.push(proyeksi(ll[i],ll[i+1]));
      const J=jalurElang(T),n=Math.ceil(J.L/.8);let p=Array.from({length:n+1},(_,i)=>J.pos(i/n));
      while(p.length>2&&!darat.dalam(...p.at(-1)))p.pop();
      let m=Infinity;const air=p.map(([x,z],i)=>{const a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],l=Math.hypot(b[0]-a[0],b[1]-a[1])||1,ux=(a[1]-b[1])/l,uz=(b[0]-a[0])/l;
        const w=.3+2.1*i/(p.length-1);for(const o of[0,-w/2,w/2,-w,w]){const X=x+ux*o,Z=z+uz*o,dc=darat.sdf(X,Z);m=Math.min(m,dc>0?kasar(X,Z,dc):0);}return Math.max(0,m);});   // penampang ±0,3 km (hulu) → ±2,4 km (hilir)
      return{nama,p,air};}),
    ruasS=S.flatMap((s,k)=>s.p.slice(1).map((b,i)=>[s.p[i],b,k,i])),dekatS=ember(ruasS,5,-1e3,-600,1e3,600),
    tinggi=(x,z,alur=1)=>{const dc=darat.sdf(x,z);if(dc<=0)return kedalaman(x,z,dc);let h=kasar(x,z,dc,alur);   // alur 0: kerucut halus (kisi kasar; jurang di shader)
      const[d,m,t]=dekatS(x,z);if(m>=0&&d<4.5){const[,,k,i]=ruasS[m],a=S[k].air,hr=a[i]+(a[i+1]-a[i])*t,u=(i+t)/(a.length-1);   // lembah melebar ke hilir: hulu sempit (tak memangkas puncak gunung)
        if(h>hr){const dasar=Math.max(hr,h-.08);h=dasar+(h-dasar)*ss(.25+.45*u,1.2+3.3*u,d);}}   // ukiran ≤ 80 m di bawah tanah asli: lembah, bukan ngarai
      return h;};
  return{tinggi,darat,laut,gunung:G,sungai:S,kerucut};}
/* RUTE: lengkung skematis di atas peta, berparameter panjang busur 3D (jalurElang): jejak tanah Catmull-Rom lewat titik [lon,lat],
   ujung menempel tanah (+turun km), tengah naik `puncak` km (visual) sebagai busur sin^½ (puncak datar) — tanda perpindahan, bukan jalan. */
function jalurRute(M,titik,{tegak=4,puncak=20,turun=1.2,n=160}={}){const J=jalurElang(titik.map(([lon,lat])=>proyeksi(lon,lat)));
  return jalurElang(Array.from({length:n+1},(_,i)=>{const u=i/n,[x,z]=J.pos(u);return[x,Math.max(0,M.tinggi(x,z))*tegak+turun+puncak*Math.sin(Math.PI*u)**.5,z];}));}
/* JARING: kisi tensor (rapat `langkah` km di `kotak`, lalu tumbuh 40 %/baris sampai ±tepi km: laut jauh di kabut) + satu tambalan
   `halus` (kotak lon/lat, `bagi` per sel kasar) di lubang kisi kasar. Tepi tambalan = interpolasi tepi kasar (tanpa retak), dilebur ke
   detail penuh dalam 2 langkah. Bahan: MeshStandard + warna hipsometrik (sawah → tegal → hutan → tanah vulkanik → abu), garis kontur
   shader 100/500 m (memudar bila terlalu rapat), laut dari kedalaman (paparan terang, garis 200 m, laut dalam), garis pantai tinta,
   alur lereng di shader (searah turun), bayang awan berarak (uWaktu = tl.time()). Peta di `grup`: grup.scale.y = relief naik. */
function petaRelief(M,{kotak=[105,-9.1,115.9,-5.5],langkah=1.8,halus=null,tegak=4,tepi=2600,warnaLaut={}}={}){
  const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);},C=h=>new THREE.Color(h),
    [ax0,az0]=proyeksi(kotak[0],kotak[3]),[ax1,az1]=proyeksi(kotak[2],kotak[1]),
    sumbu=(a,b,s)=>{const n=Math.round((b-a)/s),v=Array.from({length:n+1},(_,i)=>a+(b-a)*i/n),t=[];for(let k=1;;k++){const d=s*(1.4**k-1)/.4;t.push(d);if(d>tepi)break;}
      return[...t.map(d=>a-d).reverse(),...v,...t.map(d=>b+d)];},
    xs=sumbu(ax0,ax1,langkah),zs=sumbu(az0,az1,langkah),nx=xs.length,Hc=new Float32Array(nx*zs.length);
  for(let j=0;j<zs.length;j++)for(let i=0;i<nx;i++)Hc[j*nx+i]=M.tinggi(xs[i],zs[j],0);   // urut baris: tembolok baris z di medan(). Kasar: kerucut tanpa jurang (jurang per piksel di shader)
  const P={sawah:C('#93a565'),tegal:C('#aaa56f'),hutan:C('#86905f'),tanah:C('#9c8b6e'),abu:C('#8a8079'),cadas:C('#8e7a66')},c=new THREE.Color(),
    GN=M.gunung,dominan=(x,z)=>{let m=-1,b=0;GN.forEach((g,i)=>{const v=M.kerucut(g,x,z,0);if(v>b){b=v;m=i;}});return m;},   // gunung yang menguasai titik: indeks jurang shader
    jaring=(X,Z,H,lubang,luar)=>{const nx=X.length,nz=Z.length,n=nx*nz,pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3),gun=new Float32Array(n),idx=[],
        Y=k=>Math.max(H[k],0)*tegak,r=Math.max(1,Math.round(3.6/Math.min(...X.slice(1).map((v,i)=>v-X[i])))),at=(i,j)=>H[Math.min(nz-1,Math.max(0,j))*nx+Math.min(nx-1,Math.max(0,i))];
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i,il=Math.max(0,i-1),ir=Math.min(nx-1,i+1),jl=Math.max(0,j-1),jr=Math.min(nz-1,j+1),
          gx=(Y(j*nx+ir)-Y(j*nx+il))/(X[ir]-X[il]),gz=(Y(jr*nx+i)-Y(jl*nx+i))/(Z[jr]-Z[jl]),l=Math.hypot(gx,1,gz),h=H[k],
          lereng=Math.hypot(gx,gz)/tegak,ao=Math.max(-1,Math.min(1,((at(i-r,j)+at(i+r,j)+at(i,j-r)+at(i,j+r))/4-h)/.12));   // cekung (lembah) + / cembung (punggung) −
        pos.set([X[i],Y(k),Z[j]],k*3);nor.set([-gx/l,1/l,-gz/l],k*3);gun[k]=dominan(X[i],Z[j]);
        c.copy(P.sawah).lerp(P.tegal,ss(.05,.45,h)).lerp(P.hutan,ss(.4,1.3,h)).lerp(P.tanah,ss(1.2,2.3,h)).lerp(P.abu,ss(2.2,3.3,h)).lerp(P.cadas,.5*ss(.25,.6,lereng))
          .multiplyScalar(ao>0?1-.4*ao:1-.18*ao);col.set([c.r,c.g,c.b],k*3);
        if(luar)luar(i,j,nor,k*3);}
      for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){if(lubang&&i>=lubang[0]&&i<lubang[1]&&j>=lubang[2]&&j<lubang[3])continue;const a=j*nx+i,b=a+1,d=a+nx;idx.push(a,d,b,b,d,d+1);}
      const g=new THREE.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
      g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('tinggi',new THREE.BufferAttribute(H,1));g.setAttribute('gunung',new THREE.BufferAttribute(gun,1));return g;},
    U={uWaktu:{value:0},uAwan:{value:.1},uKontur:{value:1},uCetak:{value:0},uTerang:{value:.9},uNaik:{value:1},uTegak:{value:tegak},uTinta:{value:C('#5a5244')},
      uPantai:{value:C(warnaLaut.pantai||'#dfe2d6')},uDangkal:{value:C(warnaLaut.dangkal||'#c3cfcb')},uLaut:{value:C(warnaLaut.laut||'#88a0ad')},uLautDalam:{value:C(warnaLaut.dalam||'#5d7889')}},
    uG=GN.map(g=>new THREE.Vector4(g.x,g.z,g.R,g.kawah)),uG2=GN.map(g=>new THREE.Vector4(g.lancip,g.alur,g.jurang,g.fase)),
    bahan=jk=>{const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,metalness:0});   // jk: kuat jurang shader (kisi kasar 1, tambalan 0: jurangnya sudah geometri)
      m.onBeforeCompile=s=>{Object.assign(s.uniforms,U,{uJurang:{value:jk*.7},uG:{value:uG},uG2:{value:uG2}});
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float tinggi,gunung;varying float vH;varying vec3 vDunia;flat varying float vG;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvH=tinggi;vG=gunung;vDunia=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
uniform float uWaktu,uAwan,uKontur,uCetak,uTerang,uJurang,uNaik,uTegak;uniform vec3 uTinta,uPantai,uDangkal,uLaut,uLautDalam;uniform vec4 uG[${GN.length}],uG2[${GN.length}];
varying float vH;varying vec3 vDunia;flat varying float vG;
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+1.),u.x),u.y);}
float iso(float v,float px){float f=max(fwidth(v),1e-6),d=abs(fract(v+.5)-.5)/f;return(1.-smoothstep(px*.5,px*.5+1.,d))*(1.-smoothstep(.1,.3,f));}
float jurang(vec2 p,int i){vec4 g=uG[i],h=uG2[i];vec2 d=p-g.xy;float a=atan(d.y,d.x),R=g.z*(1.+.12*sin(2.*a+h.w)+.06*sin(3.*a+2.*h.w)),r0=(length(d)-g.w)/(R-g.w),
    r=(sqrt(r0*r0+h.x*h.x)-h.x)/(sqrt(1.+h.x*h.x)-h.x),q=h.z*a*.5+.9*sin(3.*a+h.w)+.45*sin(7.*a+2.*h.w+2.3*r)+.5*r*sin(5.*a+h.w);
  return h.y*smoothstep(.08,.42,r)*(1.-smoothstep(.82,1.,r))*pow(1.-abs(sin(q)),2.5)*(.3+.7*(.5+.5*sin(.61*q+2.1*h.w)));}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
float fh=max(fwidth(vH),1e-6),darat=smoothstep(-fh,fh,vH),paparan=smoothstep(-.2-fh,-.2+fh,vH);
diffuseColor.rgb*=1.+.09*(vn(vDunia.xz/7.)-.5)*(1.-smoothstep(.15,.5,fwidth(vDunia.x/7.)))+.06*(vn(vDunia.xz/1.9+7.)-.5)*(1.-smoothstep(.15,.5,fwidth(vDunia.x/1.9)));   // belang lahan, pudar bila lebih kecil dari piksel
diffuseColor.rgb=mix(mix(mix(uLaut,uLautDalam,smoothstep(.2,2.6,-vH)),mix(uPantai,uDangkal,smoothstep(0.,.2,-vH)),paparan),diffuseColor.rgb,darat);
float kontur=max(iso(vH*10.,1.)*.14*(1.-smoothstep(.04,.08,fwidth(vH*10.))),iso(vH*2.,1.6)*.32)*step(0.,vH)*uKontur,pantai=1.-smoothstep(.6,1.6,abs(vH)/fh),g200=1.-smoothstep(.5,1.5,abs(vH+.2)/fh);
diffuseColor.rgb=mix(diffuseColor.rgb,uTinta,max(kontur,max(pantai*.75,g200*.4)));`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.42,roughnessFactor,darat);')
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
{vec2 p=vDunia.xz;float kuat=uJurang*darat*(1.-smoothstep(.25,.6,fwidth(p.x)));   // jurang kerucut per piksel: rumus = jurang() medan, H = tinggi visual
 if(vG>-.5&&kuat>.001){int i=int(vG+.5);vec3 nw=normalize((vec4(normal,0.)*viewMatrix).xyz),nu=nw/max(nw.y,.05);float e=.12,f=jurang(p,i),H=max(vH,0.)*uTegak*uNaik*kuat;
   nu.xz+=H*vec2(jurang(p+vec2(e,0.),i)-f,jurang(p+vec2(0.,e),i)-f)/e;normal=normalize((viewMatrix*vec4(normalize(nu),0.)).xyz);}}`)
      .replace('#include <opaque_fragment>',`outgoingLight*=1.-uAwan*smoothstep(.52,.74,.65*vn(vDunia.xz/90.+vec2(uWaktu*.03,uWaktu*.01))+.35*vn(vDunia.xz/30.-vec2(uWaktu*.045,0.)));
outgoingLight=mix(outgoingLight,diffuseColor.rgb*uTerang,uCetak);   // uCetak 1 = peta cetak datar (kulit topografi), 0 = relief bercahaya
#include <opaque_fragment>`);};return m;},
    mat=bahan(1),grup=new THREE.Group();
  const dek=(A,v)=>A.reduce((m,a,i)=>Math.abs(a-v)<Math.abs(A[m]-v)?i:m,0),[p0,p1]=halus?[proyeksi(halus.kotak[0],halus.kotak[3]),proyeksi(halus.kotak[2],halus.kotak[1])]:[],
    lubang=halus&&[dek(xs,p0[0]),dek(xs,p1[0]),dek(zs,p0[1]),dek(zs,p1[1])],gk=jaring(xs,zs,Hc,lubang,null),mesh=[new THREE.Mesh(gk,mat)];
  mesh[0].name='peta';
  if(halus){const[i0,i1,j0,j1]=lubang,m=halus.bagi||4,bagi=A=>A.slice(0,-1).flatMap((a,i)=>Array.from({length:m},(_,k)=>a+(A[i+1]-a)*k/m)).concat(A.at(-1)),
      X=bagi(xs.slice(i0,i1+1)),Z=bagi(zs.slice(j0,j1+1)),Nc=gk.attributes.normal.array,w=(i,j)=>ss(0,2*langkah,Math.min(X[i]-X[0],X.at(-1)-X[i],Z[j]-Z[0],Z.at(-1)-Z[j])),
      bil=(A,i,j,o)=>{const ci=i0+Math.min(i1-i0-1,Math.floor(i/m)),cj=j0+Math.min(j1-j0-1,Math.floor(j/m)),u=(X[i]-xs[ci])/(xs[ci+1]-xs[ci]),v=(Z[j]-zs[cj])/(zs[cj+1]-zs[cj]),k=s=>((cj+(s>>1))*nx+ci+(s&1))*o;
        return Array.from({length:o},(_,q)=>(A[k(0)+q]*(1-u)+A[k(1)+q]*u)*(1-v)+(A[k(2)+q]*(1-u)+A[k(3)+q]*u)*v);},
      Hf=new Float32Array(X.length*Z.length);
    for(let j=0;j<Z.length;j++)for(let i=0;i<X.length;i++){const hc=bil(Hc,i,j,1)[0];Hf[j*X.length+i]=hc+(M.tinggi(X[i],Z[j],1)-hc)*w(i,j);}   // tepi = garis tepi kasar
    mesh.push(new THREE.Mesh(jaring(X,Z,Hf,null,(i,j,nor,o)=>{const t=w(i,j);if(t>=1)return;const n=bil(Nc,i,j,3),a=nor.subarray(o,o+3);   // normal tepi = normal kasar: tanpa jahitan cahaya
      for(let q=0;q<3;q++)a[q]=n[q]+(a[q]-n[q])*t;const l=Math.hypot(a[0],a[1],a[2]);for(let q=0;q<3;q++)a[q]/=l;}),bahan(0)));
    mesh[1].name='peta-halus';}
  for(const m of mesh){m.castShadow=m.receiveShadow=true;grup.add(m);}
  scene.add(grup);
  return{M,grup,U,tegak,tinggiDunia:(x,z)=>Math.max(0,M.tinggi(x,z))*tegak};}
/* SUNGAI: pita di muka air lembah (medan sudah mengukirnya), lebar dalam PIKSEL (vertex shader: ∝ jarak kamera), menipis ke hulu.
   Satu mesh per sungai: sungaiPeta(...)[nama].mat.color bisa di-tween (sungai yang sedang diceritakan menyala). uPx = 2·tan(½fov)/H. */
function sungaiPeta(peta,{lebar=3.2,warna:w='#2e6e8e',angkat=.03}={}){const{M,tegak,grup}=peta,U={uPx:{value:.001}},hasil={U};
  for(const s of M.sungai){const n=s.p.length,pos=[],arah=[],sisi=[],lb=[],idx=[];
    s.p.forEach(([x,z],i)=>{const a=s.p[Math.max(0,i-1)],b=s.p[Math.min(n-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,y=(Math.max(0,M.tinggi(x,z))+angkat)*tegak;   // di tanah terukir (muka air hanya batas bawah ukiran)
      for(const sd of[-1,1]){pos.push(x,y,z);arah.push(-dz/l,dx/l);sisi.push(sd);lb.push(.4+.6*i/(n-1));}if(i)idx.push(2*i-2,2*i-1,2*i,2*i-1,2*i+1,2*i);});
    const g=new THREE.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('arah',new THREE.Float32BufferAttribute(arah,2));
    g.setAttribute('sisi',new THREE.Float32BufferAttribute(sisi,1));g.setAttribute('lebar',new THREE.Float32BufferAttribute(lb,1));
    const mat=new THREE.MeshBasicMaterial({color:warna(w),side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    mat.onBeforeCompile=sh=>{sh.uniforms.uPx=U.uPx;sh.uniforms.uLebar={value:lebar};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 arah;attribute float sisi,lebar;uniform float uPx,uLebar;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.xz+=arah*sisi*lebar*uLebar*uPx*.5*distance((modelMatrix*vec4(transformed,1.)).xyz,cameraPosition);');};
    const mesh=new THREE.Mesh(g,mat);mesh.name='sungai '+s.nama;mesh.renderOrder=1;grup.add(mesh);hasil[s.nama]={mesh,mat,s};}
  return hasil;}
/* RUTE MENYALA: tabung inti (HDR, ACES menggulirkannya ke kuning-putih) + tabung pendar aditif (Fresnel terbalik), lebar dalam piksel,
   tergambar sampai uMaju (0..1, tween GSAP = fungsi murni waktu); kepala = sprite pendar + PointLight yang menerangi tanah di ujung. */
function rutePeta(peta,J,{lebar=7,warna:w='#ffb35c',cahaya=40}={}){const U={uMaju:{value:0},uPx:{value:.001}},
    kurva=new(class extends THREE.Curve{getPoint(u,t=new THREE.Vector3()){return t.set(...J.pos(u));}})(),geo=new THREE.TubeGeometry(kurva,700,1,10,false),
    bahan=(pendar,lb,kuat)=>{const m=new THREE.MeshBasicMaterial({color:warna(w).multiplyScalar(kuat),transparent:pendar,depthWrite:!pendar,blending:pendar?THREE.AdditiveBlending:THREE.NormalBlending});
      m.onBeforeCompile=s=>{Object.assign(s.uniforms,U);s.uniforms.uLebar={value:lb};
        s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uPx,uLebar;varying float vU;varying vec3 vN,vV;')
          .replace('#include <begin_vertex>','#include <begin_vertex>\nvU=uv.x;transformed+=normal*(uLebar*uPx*.5*distance((modelMatrix*vec4(transformed,1.)).xyz,cameraPosition)-1.);')
          .replace('#include <project_vertex>','#include <project_vertex>\nvV=-mvPosition.xyz;vN=normalMatrix*normal;');
        s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uMaju;varying float vU;varying vec3 vN,vV;')
          .replace('#include <color_fragment>','#include <color_fragment>\nif(vU>uMaju)discard;'+(pendar?'diffuseColor.a*=pow(abs(dot(normalize(vN),normalize(vV))),2.2);':''));};return m;},
    inti=new THREE.Mesh(geo,bahan(false,lebar,3.2)),pendar=new THREE.Mesh(geo,bahan(true,lebar*4.5,1.4)),
    kanvas=Object.assign(document.createElement('canvas'),{width:128,height:128}),g2=kanvas.getContext('2d'),gr=g2.createRadialGradient(64,64,0,64,64,64);
  [[0,'rgba(255,255,255,1)'],[.18,'rgba(255,214,150,.9)'],[.45,'rgba(255,150,60,.3)'],[1,'rgba(255,120,40,0)']].forEach(([o,c])=>gr.addColorStop(o,c));g2.fillStyle=gr;g2.fillRect(0,0,128,128);
  const kepala=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(kanvas),blending:THREE.AdditiveBlending,depthWrite:false,color:warna(w).multiplyScalar(2.2)})),
    L=new THREE.PointLight(warna(w),cahaya,0,2),maju={v:0};
  inti.name='rute';pendar.renderOrder=2;kepala.renderOrder=3;peta.grup.add(inti,pendar,kepala,L);
  return{J,U,maju,inti,pendar,kepala,cahaya:L,
    /* panggil tiap frame sesudah kamera: tebal piksel, kepala di ujung yang tergambar */
    perbarui(){const u=Math.min(1,Math.max(0,maju.v)),p=new THREE.Vector3(...J.pos(u)),d=p.clone().applyMatrix4(peta.grup.matrixWorld).distanceTo(camera.position);
      U.uMaju.value=u;kepala.position.copy(p);L.position.copy(p);kepala.visible=L.visible=u>0;kepala.scale.setScalar(lebar*6*U.uPx.value*d);L.intensity=cahaya*Math.min(1,u*20);}};}
/* LABEL DOM di titik 3D: diproyeksikan ulang setiap render (seek mana pun), jadi selalu menempel di peta. sepanjang: titik kedua
   [lon,lat] → teks diputar searah layar (sungai), tetap tegak (±40°). Tanpa uji oklusi: label di balik punggung gunung tetap tampak. */
const LABEL=[];
function labelPeta(peta,teks,{lon,lat,naik=0,kelas='',sepanjang=null,induk='#label'}){const el=document.createElement('div'),titik=(lo,la)=>{const[x,z]=proyeksi(lo,la);
    return new THREE.Vector3(x,peta.tinggiDunia(x,z)+naik,z);};
  el.className='lp '+kelas;el.innerHTML=teks;document.querySelector(induk).appendChild(el);
  LABEL.push({el,peta,p:titik(lon,lat),q:sepanjang&&titik(...sepanjang)});return el;}
function tempelLabel(){camera.updateMatrixWorld();const v=new THREE.Vector3(),u=new THREE.Vector3(),layar=a=>[(a.x+1)/2*W,(1-a.y)/2*H];
  for(const L of LABEL){L.peta.grup.updateMatrixWorld();v.copy(L.p).applyMatrix4(L.peta.grup.matrixWorld).project(camera);const ok=Math.abs(v.z)<1;L.el.style.visibility=ok?'':'hidden';if(!ok)continue;
    const[x,y]=layar(v);let r=0;if(L.q){const[x2,y2]=layar(u.copy(L.q).applyMatrix4(L.peta.grup.matrixWorld).project(camera));r=Math.atan2(y2-y,x2-x)*180/Math.PI;if(r>90)r-=180;if(r<-90)r+=180;r=Math.max(-40,Math.min(40,r));}
    L.el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`+(r?` rotate(${r.toFixed(2)}deg)`:'');}}
/* bayangan matahari ikut kamera, skala km: kotak bayang ±r di sekitar titik tatap di y=0, r ∝ jarak kamera (dijepit), posisi dibulatkan ke
   texel ruang cahaya (pola ikutMatahari di lanskap-3d). normalBias ∝ texel. Panggil sesudah applyCam(), sebelum render. */
function ikutMatahariPeta(arah,{min=40,maks=900}={}){const d=camera.getWorldDirection(new THREE.Vector3()),c=camera.position.clone().addScaledVector(d,d.y<-.02?-camera.position.y/d.y:camera.position.y*8);
  c.y=0;const r=Math.min(maks,Math.max(min,.8*camera.position.distanceTo(c))),ka=new THREE.Vector3().crossVectors(arah,new THREE.Vector3(0,1,0)).normalize(),
    at=new THREE.Vector3().crossVectors(ka,arah).normalize(),tx=2*r/key.shadow.mapSize.x,bul=v=>c.addScaledVector(v,Math.round(c.dot(v)/tx)*tx-c.dot(v));
  bul(ka);bul(at);key.target.position.copy(c);key.position.copy(c).addScaledVector(arah,3*r);
  Object.assign(key.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:.1,far:6*r});key.shadow.camera.updateProjectionMatrix();key.shadow.normalBias=1.2*tx;}
