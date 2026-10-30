/* ===== MEMORY: стандартные данные =====
   Это примерный каталог, пока владелец не загрузит свой через админку.
   Цены примерные. Опубликованная база лежит в data/db.json и важнее этих данных. */

/* семейства ароматов: ключ -> название */
const FAMILIES = {
  woody:'Древесные', oriental:'Восточные', oud:'Уд', spicy:'Пряные', leather:'Кожаные',
  gourmand:'Сладкие', fresh:'Свежие', citrus:'Цитрусовые', aromatic:'Фужерные', floral:'Цветочные'
};
const GENDERS = { m:'Мужской', w:'Женский', u:'Унисекс' };
const CONCS = { EDT:'Туалетная вода', EDP:'Парфюмерная вода', Parfum:'Духи', Extrait:'Экстракт' };
const SEASONS = { winter:'Зима', spring:'Весна', summer:'Лето', autumn:'Осень' };
const TIMES = { day:'День', night:'Вечер' };
/* характер аромата: для подбора и для досье */
const CHARS = {
  leader:{ name:'Лидер', hint:'Уверенный, тяжёлый, его слышат первым' },
  calm:{ name:'Спокойная сила', hint:'Чисто, дорого, без крика' },
  bold:{ name:'Дерзкий', hint:'Пряности, кожа, характер' },
  fresh:{ name:'Свежий', hint:'Лёгкий, чистый, на каждый день' }
};
const OCCS = { daily:'Каждый день', work:'Работа и встречи', evening:'Вечерние встречи', event:'Торжество' };
const NOTE_PICKS = ['уд','ваниль','табак','кожа','роза','амбра','сандал','шафран','бергамот','лаванда','ладан','пачули'];

const DEFAULT_PRODUCTS = [
  { id:'oud-wood', code:'0471', brand:'Tom Ford', name:'Oud Wood', conc:'EDP', gender:'u',
    fam:['oud','woody'], top:['уд','розовое дерево','кардамон'], heart:['сандал','ветивер','чёрный перец'], base:['бобы тонка','ваниль','амбра'],
    desc:'Сухой благородный уд без резкости. Аромат для человека, которому не нужно ничего доказывать.',
    variants:[{ml:5,price:1500},{ml:10,price:2800},{ml:100,price:32000}],
    season:['autumn','winter','spring'], time:['day','night'], lon:3, sil:3, char:['calm','leader'], occ:['work','evening'],
    bottle:{shape:'block',tint:'#6B3F22',cap:'black'}, hit:true, images:[] },
  { id:'aventus', code:'0472', brand:'Creed', name:'Aventus', conc:'EDP', gender:'m',
    fam:['fresh','woody'], top:['ананас','бергамот','чёрная смородина','яблоко'], heart:['берёза','пачули','жасмин'], base:['мускус','дубовый мох','амбра','ваниль'],
    desc:'Классика успеха: дымная берёза и сочный ананас. Подходит и на переговоры, и на вечер.',
    variants:[{ml:5,price:1800},{ml:10,price:3400},{ml:100,price:42000}],
    season:['spring','summer','autumn'], time:['day','night'], lon:4, sil:4, char:['leader','fresh'], occ:['work','daily','event'],
    bottle:{shape:'tall',tint:'#2B2B2E',cap:'silver'}, hit:true, images:['images/p/aventus-1.webp'] },
  { id:'br540', code:'0473', brand:'Maison Francis Kurkdjian', name:'Baccarat Rouge 540', conc:'EDP', gender:'u',
    fam:['oriental','woody'], top:['шафран','жасмин'], heart:['амбровое дерево','амбра'], base:['смола ели','кедр'],
    desc:'Сияющий шлейф, который узнают в комнате. Сладко-минеральный, очень стойкий.',
    variants:[{ml:5,price:1900},{ml:10,price:3600},{ml:70,price:39000}],
    season:['autumn','winter','spring'], time:['night'], lon:5, sil:5, char:['leader','bold'], occ:['evening','event'],
    bottle:{shape:'facet',tint:'#B3122A',cap:'gold'}, hit:true, images:[] },
  { id:'layton', code:'0474', brand:'Parfums de Marly', name:'Layton', conc:'EDP', gender:'m',
    fam:['oriental','aromatic'], top:['яблоко','лаванда','бергамот','мандарин'], heart:['герань','фиалка','жасмин'], base:['ваниль','кардамон','пачули','сандал','перец'],
    desc:'Тёплая ваниль с лавандой и пряностями. Мощный, взрослый, зимний.',
    variants:[{ml:5,price:1200},{ml:10,price:2200},{ml:125,price:29000}],
    season:['autumn','winter'], time:['night'], lon:4, sil:4, char:['leader','bold'], occ:['evening','event'],
    bottle:{shape:'round',tint:'#1E2A44',cap:'gold'}, images:[] },
  { id:'sauvage-elixir', code:'0475', brand:'Dior', name:'Sauvage Elixir', conc:'Parfum', gender:'m',
    fam:['spicy','aromatic'], top:['корица','мускатный орех','кардамон','грейпфрут'], heart:['лаванда'], base:['лакрица','сандал','амбра','пачули','ветивер'],
    desc:'Концентрированная версия Sauvage: пряности, лаванда и тёмное дерево. Слышно издалека.',
    variants:[{ml:5,price:1100},{ml:10,price:2000},{ml:60,price:19000}],
    season:['autumn','winter'], time:['night'], lon:5, sil:5, char:['leader','bold'], occ:['evening','event'],
    bottle:{shape:'block',tint:'#3A3F4A',cap:'black'}, hit:true, images:[] },
  { id:'bleu-chanel', code:'0476', brand:'Chanel', name:'Bleu de Chanel', conc:'EDP', gender:'m',
    fam:['fresh','woody','citrus'], top:['грейпфрут','лимон','мята','розовый перец'], heart:['имбирь','мускатный орех','жасмин'], base:['ладан','ветивер','кедр','сандал','пачули'],
    desc:'Чистый, собранный, уместный везде. Аромат на каждый рабочий день.',
    variants:[{ml:5,price:900},{ml:10,price:1700},{ml:100,price:17500}],
    season:['spring','summer','autumn','winter'], time:['day'], lon:4, sil:3, char:['calm','fresh'], occ:['daily','work'],
    bottle:{shape:'block',tint:'#18233A',cap:'black'}, images:[] },
  { id:'tobacco-vanille', code:'0477', brand:'Tom Ford', name:'Tobacco Vanille', conc:'EDP', gender:'u',
    fam:['gourmand','spicy'], top:['табачный лист','пряности'], heart:['ваниль','какао','бобы тонка','цветок табака'], base:['сухофрукты','древесные ноты'],
    desc:'Табак, ваниль и сухофрукты. Тяжёлый тёплый аромат для холодных вечеров.',
    variants:[{ml:5,price:1500},{ml:10,price:2800},{ml:50,price:27000}],
    season:['autumn','winter'], time:['night'], lon:5, sil:4, char:['bold','leader'], occ:['evening'],
    bottle:{shape:'block',tint:'#7A4A1E',cap:'black'}, images:[] },
  { id:'naxos', code:'0478', brand:'Xerjoff', name:'Naxos', conc:'EDP', gender:'u',
    fam:['gourmand','aromatic'], top:['лаванда','бергамот','лимон'], heart:['мёд','корица','кашмеран','жасмин'], base:['табачный лист','ваниль','бобы тонка'],
    desc:'Мёд, табак и лаванда. Богатый и мягкий, для тех, кто ценит детали.',
    variants:[{ml:5,price:1400},{ml:10,price:2600},{ml:100,price:30000}],
    season:['autumn','winter','spring'], time:['day','night'], lon:4, sil:4, char:['calm','bold'], occ:['evening','work'],
    bottle:{shape:'facet',tint:'#9A6A1C',cap:'gold'}, isNew:true, images:[] },
  { id:'oud-greatness', code:'0479', brand:'Initio', name:'Oud for Greatness', conc:'EDP', gender:'u',
    fam:['oud','woody','spicy'], top:['шафран','мускатный орех','лаванда'], heart:['уд'], base:['пачули','мускус'],
    desc:'Густой уд с шафраном. Аромат статуса, на особые случаи.',
    variants:[{ml:5,price:1600},{ml:10,price:3000},{ml:90,price:33000}],
    season:['autumn','winter'], time:['night'], lon:5, sil:5, char:['leader'], occ:['event','evening'],
    bottle:{shape:'tall',tint:'#141416',cap:'black'}, isNew:true, images:[] },
  { id:'interlude', code:'0480', brand:'Amouage', name:'Interlude Man', conc:'EDP', gender:'m',
    fam:['oriental','spicy','leather'], top:['бергамот','орегано','перец'], heart:['ладан','амбра','опопонакс'], base:['уд','кожа','сандал','пачули'],
    desc:'Дым ладана, кожа и смолы. Сложный, тёмный, с характером.',
    variants:[{ml:5,price:1300},{ml:10,price:2400},{ml:100,price:28000}],
    season:['autumn','winter'], time:['night'], lon:5, sil:5, char:['bold','leader'], occ:['evening','event'],
    bottle:{shape:'round',tint:'#2E3B52',cap:'silver'}, images:[] },
  { id:'angels-share', code:'0481', brand:'Kilian', name:"Angels' Share", conc:'EDP', gender:'u',
    fam:['gourmand','oriental'], top:['коньячные ноты'], heart:['корица','бобы тонка','дуб'], base:['пралине','ваниль','сандал'],
    desc:'Коньячная бочка, корица и пралине. Тёплый, обволакивающий, вечерний.',
    variants:[{ml:5,price:1500},{ml:10,price:2800},{ml:50,price:26000}],
    season:['autumn','winter'], time:['night'], lon:4, sil:4, char:['calm','bold'], occ:['evening','event'],
    bottle:{shape:'flask',tint:'#8A4B12',cap:'gold'}, isNew:true, images:[] },
  { id:'ombre-nomade', code:'0482', brand:'Louis Vuitton', name:'Ombre Nomade', conc:'EDP', gender:'u',
    fam:['oud','woody'], top:['уд','малина'], heart:['роза','герань','шафран'], base:['ладан','бензоин','берёза'],
    desc:'Уд, ладан и роза. Дорогой и тяжёлый, для тех, кто привык к лучшему.',
    variants:[{ml:5,price:2400},{ml:10,price:4600},{ml:100,price:52000}],
    season:['autumn','winter'], time:['night'], lon:5, sil:5, char:['leader'], occ:['event','evening'],
    bottle:{shape:'block',tint:'#3B1E14',cap:'black'}, images:[] },
  { id:'terre-hermes', code:'0483', brand:'Hermès', name:"Terre d'Hermès", conc:'EDT', gender:'m',
    fam:['woody','citrus'], top:['апельсин','грейпфрут'], heart:['перец','герань','кремень'], base:['ветивер','кедр','пачули','бензоин'],
    desc:'Земля, цитрус и ветивер. Спокойный мужской аромат без лишнего.',
    variants:[{ml:5,price:700},{ml:10,price:1300},{ml:100,price:14500}],
    season:['spring','summer','autumn'], time:['day'], lon:3, sil:3, char:['calm','fresh'], occ:['daily','work'],
    bottle:{shape:'block',tint:'#C26A1C',cap:'silver'}, images:[] },
  { id:'khamrah', code:'0484', brand:'Lattafa', name:'Khamrah', conc:'EDP', gender:'u',
    fam:['gourmand','oriental','spicy'], top:['корица','мускатный орех','бергамот'], heart:['финики','пралине','тубероза'], base:['ваниль','бобы тонка','бензоин','мирра','амбра'],
    desc:'Финики, корица и ваниль. Восточная сладость по доступной цене.',
    variants:[{ml:10,price:600},{ml:100,price:4200}],
    season:['autumn','winter'], time:['night'], lon:5, sil:4, char:['bold'], occ:['evening','daily'],
    bottle:{shape:'facet',tint:'#7A2E14',cap:'gold'}, isNew:true, images:[] },
  { id:'libre', code:'0485', brand:'Yves Saint Laurent', name:'Libre', conc:'EDP', gender:'w',
    fam:['floral','aromatic'], top:['лаванда','мандарин','чёрная смородина'], heart:['флёрдоранж','жасмин','лаванда'], base:['ваниль','мускус','кедр','амбра'],
    desc:'Лаванда и флёрдоранж на тёплой ванили. Смелый женский аромат.',
    variants:[{ml:5,price:800},{ml:10,price:1500},{ml:90,price:15500}],
    season:['spring','autumn','winter'], time:['day','night'], lon:4, sil:4, char:['bold'], occ:['daily','evening'],
    bottle:{shape:'block',tint:'#C9A24A',cap:'gold'}, images:[] },
  { id:'coco-mademoiselle', code:'0486', brand:'Chanel', name:'Coco Mademoiselle', conc:'EDP', gender:'w',
    fam:['floral','citrus'], top:['апельсин','бергамот','грейпфрут'], heart:['роза','жасмин','личи'], base:['пачули','ветивер','ваниль','мускус'],
    desc:'Роза и пачули с цитрусом. Элегантный аромат, который подходит к любому образу.',
    variants:[{ml:5,price:900},{ml:10,price:1700},{ml:100,price:18500}],
    season:['spring','summer','autumn'], time:['day'], lon:4, sil:3, char:['calm','fresh'], occ:['daily','work','event'],
    bottle:{shape:'block',tint:'#D9A28A',cap:'black'}, images:[] }
];

const DEFAULT_STORE = {
  name:'MEMORY', city:'Грозный', address:'', hours:'', currency:'₽',
  telegram:'', whatsapp:'', instagram:'',
  heroTitle:'Запах, который запоминают', heroSub:'Оригинальная парфюмерия и отливанты. Выберите аромат, соберите заказ и отправьте его в мессенджер.',
  heroImg:'', ownerNote:'Только оригинальная парфюмерия. Каждый флакон проверяем перед продажей, отливанты разливаем из своих флаконов.', ownerName:'Ибрагим Токкаев',
  delivery:'Самовывоз из магазина, курьер по Грозному в день заказа, доставка по Чечне и по России транспортной компанией. Стоимость доставки скажет менеджер.',
  seller:'', inn:''
};
const DEFAULT_ADMIN = { user:'admin', hash:'a14c619bef92d5ff4c2d238b43fc7c2643b0728ac30ee688f83bb46cf4d74f6f' };   // пароль хранится только в виде отпечатка (SHA-256)
