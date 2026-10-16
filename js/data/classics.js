// ==========================
// CLASSIC CINEMA LIBRARY
// ==========================
// Every film here is in the public domain in the US (or released under a
// Creative Commons licence), so it can be streamed legally for free from
// the Internet Archive (archive.org).
//
// archiveIds: known Internet Archive items to try first (fast path).
// If none work, the app searches the Archive by title/year and remembers
// the result — so a film with an empty list still plays.
//
// genres use the keys of MyFlix.classicGenres below.
(function (MyFlix) {
    MyFlix.classicGenres = {
        action: "Action & Adventure",
        comedy: "Comedy",
        drama: "Drama",
        horror: "Horror",
        scifi: "Sci-Fi",
        romance: "Romance",
        thriller: "Thriller",
        crime: "Crime",
        mystery: "Mystery",
        fantasy: "Fantasy",
        animation: "Animation",
        documentary: "Documentary",
        family: "Family",
        war: "War",
        western: "Western"
    };

    MyFlix.classics = [
        { id: "mark-of-zorro", title: "The Mark of Zorro", year: 1920, runtime: 79, genres: ["action", "romance"], licence: "Public domain",
          description: "A foppish nobleman in Spanish California secretly fights tyranny as a masked swordsman. The swashbuckler that set the template for every caped hero after it." },
        { id: "the-general", title: "The General", year: 1926, runtime: 78, genres: ["action", "comedy", "war"], licence: "Public domain",
          description: "Buster Keaton plays a train engineer who chases his stolen locomotive deep behind enemy lines, with stunts that still look impossible today." },
        { id: "thief-of-bagdad", title: "The Thief of Bagdad", year: 1924, runtime: 140, genres: ["fantasy", "action"], licence: "Public domain",
          description: "A charming thief falls for a princess and sets out on a quest of flying carpets, monsters and magic. A lavish silent-era spectacle." },
        { id: "sherlock-jr", title: "Sherlock Jr.", year: 1924, runtime: 45, genres: ["comedy", "mystery"], licence: "Public domain",
          description: "A projectionist dreams himself into the movie he is showing and becomes a master detective. Keaton's playful love letter to cinema." },
        { id: "the-kid", title: "The Kid", year: 1921, runtime: 68, genres: ["comedy", "drama", "family"], licence: "Public domain",
          description: "Charlie Chaplin's Tramp takes in an abandoned baby and raises him on the streets, until the authorities come to take the boy away." },
        { id: "his-girl-friday", title: "His Girl Friday", year: 1940, runtime: 92, genres: ["comedy", "romance"], licence: "Public domain",
          description: "A fast-talking editor tries to win back his ex-wife, his best reporter, by dragging her into one last explosive story." , archiveIds: ["his_girl_friday"] },
        { id: "my-man-godfrey", title: "My Man Godfrey", year: 1936, runtime: 94, genres: ["comedy", "romance"], licence: "Public domain",
          description: "A scatterbrained heiress hires a 'forgotten man' from the city dump as her family's butler, and he turns out to be far more than he seems." },
        { id: "meet-john-doe", title: "Meet John Doe", year: 1941, runtime: 122, genres: ["drama", "comedy"], licence: "Public domain",
          description: "A reporter invents a protest letter from a fictional everyman, then hires a drifter to play him, sparking a movement nobody can control." },
        { id: "nosferatu", title: "Nosferatu", year: 1922, runtime: 94, genres: ["horror"], licence: "Public domain",
          description: "The original screen vampire: the eerie Count Orlok brings plague and dread to a German town. Shadows have never been scarier." , archiveIds: ["Nosferatu1922"] },
        { id: "night-of-the-living-dead", title: "Night of the Living Dead", year: 1968, runtime: 96, genres: ["horror"], licence: "Public domain",
          description: "Strangers barricade themselves in a farmhouse as the dead rise outside. The low-budget film that invented the modern zombie." },
        { id: "phantom-of-the-opera", title: "The Phantom of the Opera", year: 1925, runtime: 93, genres: ["horror", "romance"], licence: "Public domain",
          description: "A masked figure haunting the Paris Opera becomes obsessed with a young singer. Famous for Lon Chaney's unforgettable unmasking." },
        { id: "cabinet-of-dr-caligari", title: "The Cabinet of Dr. Caligari", year: 1920, runtime: 76, genres: ["mystery", "horror"], licence: "Public domain",
          description: "A sinister showman and his sleepwalking servant are linked to a string of murders, in a twisted painted world of jagged sets." },
        { id: "metropolis", title: "Metropolis", year: 1927, runtime: 153, genres: ["scifi", "drama"], licence: "Public domain",
          description: "In a gleaming future city, the son of its ruler discovers the workers toiling below. Fritz Lang's vision shaped science fiction for a century." , archiveIds: ["metropolis-1927-english-titles"] },
        { id: "trip-to-the-moon", title: "A Trip to the Moon", year: 1902, runtime: 14, genres: ["scifi", "fantasy"], licence: "Public domain",
          description: "Astronomers fire a capsule into the eye of the Moon and meet its strange inhabitants. Georges Méliès' magical, pioneering short." },
        { id: "lost-world", title: "The Lost World", year: 1925, runtime: 93, genres: ["fantasy", "scifi", "family"], licence: "Public domain",
          description: "An expedition finds a plateau in South America where dinosaurs still roam, then brings one back to London. Stop-motion wonder." },
        { id: "sunrise", title: "Sunrise", year: 1927, runtime: 94, genres: ["drama", "romance"], licence: "Public domain",
          description: "A farmer tempted to betray his wife instead rediscovers his love for her over one day in the big city. Often called the most beautiful silent film." },
        { id: "wings", title: "Wings", year: 1927, runtime: 144, genres: ["war", "romance", "drama"], licence: "Public domain",
          description: "Two rival pilots become friends in the skies of World War I. The very first Best Picture winner, with stunning aerial combat." },
        { id: "detour", title: "Detour", year: 1945, runtime: 68, genres: ["thriller", "crime"], licence: "Public domain",
          description: "A hitchhiking pianist's bad luck spirals into a nightmare after a stranger dies in the car he's driving. Lean, mean film noir." },
        { id: "doa", title: "D.O.A.", year: 1950, runtime: 83, genres: ["thriller", "mystery", "crime"], licence: "Public domain",
          description: "A man learns he has been fatally poisoned and has only days to find out who did it, and why." },
        { id: "scarlet-street", title: "Scarlet Street", year: 1945, runtime: 102, genres: ["crime", "drama"], licence: "Public domain",
          description: "A timid cashier and amateur painter is drawn into a con by a woman and her ruthless boyfriend, with devastating results." },
        { id: "the-stranger", title: "The Stranger", year: 1946, runtime: 95, genres: ["crime", "thriller"], licence: "Public domain",
          description: "A war crimes investigator hunts a fugitive hiding as a respected teacher in a quiet Connecticut town. Directed by and starring Orson Welles." },
        { id: "sherlock-secret-weapon", title: "Sherlock Holmes and the Secret Weapon", year: 1942, runtime: 68, genres: ["mystery", "war"], licence: "Public domain",
          description: "Holmes and Watson must protect a scientist and his new bombsight from Professor Moriarty during World War II." },
        { id: "gullivers-travels", title: "Gulliver's Travels", year: 1939, runtime: 76, genres: ["animation", "family", "fantasy"], licence: "Public domain",
          description: "A shipwrecked sailor wakes up as a giant in the tiny land of Lilliput, on the eve of a war over a wedding song." },
        { id: "superman-mechanical-monsters", title: "Superman: The Mechanical Monsters", year: 1941, runtime: 10, genres: ["animation", "scifi"], licence: "Public domain",
          description: "Superman battles a mad scientist's flying robots in one of the gorgeous Fleischer Studios cartoons." },
        { id: "sintel", title: "Sintel", year: 2010, runtime: 15, genres: ["animation", "fantasy"], licence: "CC BY 3.0 · Blender Foundation",
          description: "A lone young woman searches a harsh world for the baby dragon she once rescued. A moving open-source short from the Blender Foundation." , archiveIds: ["Sintel"] },
        { id: "big-buck-bunny", title: "Big Buck Bunny", year: 2008, runtime: 10, genres: ["animation", "family", "comedy"], licence: "CC BY 3.0 · Blender Foundation",
          description: "A gentle giant rabbit takes comic revenge on three bullying rodents. The famous open-source animated short." , archiveIds: ["BigBuckBunny_124"] },
        { id: "nanook-of-the-north", title: "Nanook of the North", year: 1922, runtime: 79, genres: ["documentary", "family"], licence: "Public domain",
          description: "Life with an Inuit family in the Canadian Arctic: hunting, trading and building an igloo. A landmark of documentary film." },
        { id: "man-with-a-movie-camera", title: "Man with a Movie Camera", year: 1929, runtime: 68, genres: ["documentary"], licence: "Public domain",
          description: "A dazzling day in the life of Soviet cities, told with no words at all, just bold editing and camera tricks." },
        { id: "battle-of-san-pietro", title: "The Battle of San Pietro", year: 1945, runtime: 32, genres: ["documentary", "war"], licence: "Public domain (US Government)",
          description: "John Huston's frontline record of the fight for an Italian village in World War II. Raw and unforgettable." },
        { id: "little-princess", title: "The Little Princess", year: 1939, runtime: 93, genres: ["family", "drama"], licence: "Public domain",
          description: "Shirley Temple plays a girl who is left penniless at a strict boarding school when her father goes missing in the war." },
        { id: "great-train-robbery", title: "The Great Train Robbery", year: 1903, runtime: 12, genres: ["western", "crime", "action"], licence: "Public domain",
          description: "Bandits hold up a train and flee into the hills with a posse on their trail. The short that made the Western a genre." },
        { id: "angel-and-the-badman", title: "Angel and the Badman", year: 1947, runtime: 100, genres: ["western", "romance"], licence: "Public domain",
          description: "A wounded gunfighter is nursed back to health by a Quaker family, and starts to question his violent life. Starring John Wayne." },
        { id: "mclintock", title: "McLintock!", year: 1963, runtime: 127, genres: ["western", "comedy"], licence: "Public domain",
          description: "A cattle baron's estranged wife returns to town, and chaos follows. A rowdy comedy Western with John Wayne and Maureen O'Hara." }
    ];

    // Themed rows on the Classics page ("Classic Cinema nights").
    MyFlix.classicCollections = [
        { id: "silent", title: "The Silent Era", note: "Before sound, pictures told everything", filter: f => f.year < 1930 },
        { id: "noir", title: "Film Noir Nights", note: "Shadows, smoke and bad decisions", ids: ["detour", "doa", "scarlet-street", "the-stranger"] },
        { id: "comedy", title: "Golden Age Comedy", ids: ["his-girl-friday", "my-man-godfrey", "sherlock-jr", "the-kid", "the-general", "meet-john-doe", "mclintock"] },
        { id: "monsters", title: "Monster Classics", note: "Where horror began", ids: ["nosferatu", "night-of-the-living-dead", "phantom-of-the-opera", "cabinet-of-dr-caligari", "lost-world"] },
        { id: "animated", title: "Animated Gems", ids: ["gullivers-travels", "superman-mechanical-monsters", "sintel", "big-buck-bunny"] },
        { id: "west", title: "The Wild West", ids: ["great-train-robbery", "angel-and-the-badman", "mclintock"] },
        { id: "war", title: "War Stories", ids: ["wings", "battle-of-san-pietro", "the-general", "sherlock-secret-weapon"] },
        { id: "short", title: "Under 20 Minutes", note: "Perfect for a quick watch", filter: f => f.runtime <= 20 },
        { id: "real", title: "Real Life on Film", ids: ["nanook-of-the-north", "man-with-a-movie-camera", "battle-of-san-pietro"] }
    ];
})(window.MyFlix = window.MyFlix || {});
