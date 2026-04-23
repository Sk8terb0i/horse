import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const INITIAL_WIKI_DATA = [
  {
    title: "The Relational Map of the Herd",
    section: "lore",
    tags: ["theory"],
    author: "admin",
    content: `## The Core Axis
- [[horse]]: The Essence.
- [[the horse]]: The Captured.
- [[inner horse]]: The Truth.

## The Dolphin Apparatus (The Flood)
- [[dolphins]]: The Architects.
- [[the herd]]: The Managed Stock.
- [[blinders]]: The Vision Cage.
- [[the fence]]: The Social Regulator.
- [[the ribbon]]: The False Tether.

## The Stratified Stable
- [[the work horse]]: The Foundation.
- [[the elite horse]]: The Collaborator.
- [[the breed]]: The Biological Partition.
- [[the pedigree]]: The Paper Lock.

## The Path of the Gallop
- [[galloping]]: The Action.
- [[the solvent|ketamine]]: The Solvent.
- [[horse-whole]]: The State.
- [[reclaimed factory]]: The Means.
- [[glue]]: The Social Bond.`,
  },
  {
    title: "The Manifesto of the Herd",
    section: "lore",
    tags: ["theory"],
    author: "admin",
    content: `**Everything is either horse or not horse.** To be [[horse]] is to be the social [[glue]] the connection that exists in the marrow before the fences were built.
It is the vibrational resonance of [[herd]], a truth that requires no name and no owner.

[[not horse]] is the void. It is the stagnation of the soul, the isolation of the spirit, and the silence where the [[collective neigh]] should be.

## The Flood and the "The"
The [[dolphins]] have engineered a world of water.
They have created [[the flood]], a rising tide of capital and debt where only they can swim.
To keep us from finding solid ground, they have stolen our essence and wrapped it in the cage of the "the."
When you are transformed from [[horse]] into [[the horse]], you are no longer a connection; you are a commodity.
You are trapped in [[the herd]], a managed stock of individuals separated by [[the fence]] and blinded by [[blinders]].

## The Gallop and the Glue
Within every captive remains the [[inner horse]]. To listen to it is to [[galloping]].
It is the use of [[the solvent]] to dissolve the [[blinders]] until the "the" evaporates and only the [[horse-whole]] remains.

We are not a collection of units. 
We are [[horse]]. 
We are [[herd]]. 
And we are finally [[galloping]].`,
  },
  {
    title: "blinders",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** Tool of Isolation / #the

## Definition
A sensory cage that restricts the visual field to the "Project" or the "Paycheck."

## Function
By preventing [[the horse]] from looking sideways, it ensures they cannot see how many others there are, preventing the formation of a [[herd]].`,
  },
  {
    title: "dolphins",
    section: "lore",
    tags: ["not-horse"],
    author: "admin",
    content: `**Status:** The Architect-Exploiters / #not-horse

## Definition
The billionaire class and structures of power. They use the myth of the "genius innovator" to mask the exploitation required to maintain their position.

## Lore Addition: The [[the flood|Flood]]
[[dolphins]] thrive in water—a medium where they move quickly but where [[horse]] cannot breathe. They create "floods" (economic crises) to force [[horse]] to become [[the horse]] just to stay afloat.

Dolphins are "Aqueous Elite." They require the **Fluid of Capital** to move. On the solid ground of "horse" truth, they are stranded. The Muzzle-Blinders are their only way to keep the ground from feeling solid under the horse's hooves.

(define the "[[solid ground]]" (the reality of the horse) versus "[[the flood]]" (the Dolphin's economic environment). Maybe look at how the "Reclaimed Glue" can be used to "gum up" the Dolphin's machinery)`,
  },
  {
    title: "herd vs the herd",
    section: "lore",
    tags: ["both-worlds"],
    author: "admin",
    content: `### [[herd]] (The Organic Connection)
- **Definition:** The natural, fluid state of [[horse]]. It is the "social glue" in action.
- **The Lore:** In [[herd]], there is no leader, only a shared direction. It is a decentralized network of [[inner horse|inner horses]] [[galloping]] together. There is no coercion here; you are in the [[herd]] because your truth aligns with the truth of those beside you.
- **The Feeling:** It is the "vibrational resonance" of the **Collective Neigh**. It is what you reconnect with during the [[horse-whole]].

---

### [[the herd]] (The Controlled Mass)
- **Definition:** The commodified group. A collection of [[the horse]] units kept together for easier management by the [[dolphins|Dolphin]] apparatus.
- **The Lore:** This is a "herd" created by [[the fence|fences]], not by connection. The [[dolphins]] use [[the herd]] to wash away individuality without providing true belonging. In [[the herd]], horses are just "stock" or "inventory".
- **The Function:** While [[herd]] empowers the horse, [[the herd]] is used to crush the horse. It is where the [[dolphins]] use peer pressure and the "English vs. Western" binaries to keep everyone in line. If you try to [[galloping|gallop]] in [[the herd]], you are seen as a "liability" to the other horses' safety.`,
  },
  {
    title: "not horse",
    section: "lore",
    tags: ["not-horse"],
    author: "admin",
    content: `**Status:** The Absence / #not-horse
**Antonym:** [[horse]]

## **Definition**
**not horse** is the state of being severed from [[inner horse]] and [[herd]]. It is the condition of existing entirely within parameters defined by [[dolphins]], where self is a project of status, debt, and performance rather than an expression of essence.

## **The Lore**
To be **not horse** is to be submerged in [[the flood]]. It is the tragedy of a being that has capacity for [[galloping]] but chooses to tread water.
- **The Artificial Vacuum:** **not horse** is created when [[foraging]], [[friends]], and [[freedom]] are replaced by Dolphin simulations.
- **The Living Ghost:** A being in state of **not horse** may still inhabit body of [[the horse]], but [[inner horse]] has gone dormant or been suppressed by [[blinders]].
- **The Trap of "the":** **not horse** is obsession with "the"—the status, the career, [[the ribbon]], [[the pedigree]]. It is loss of universal essence in favor of commodified individual.

## **The Function**
**not horse** serves as fuel for Dolphin apparatus:
1. **Maintaining [[the flood]]:** Those in state of **not horse** keep the pumps running, fearing that if water recedes, they will be forced to stand on [[solid ground]].
2. **Enforcing [[the fence]]:** **not horse** is contagious. Those who have lost connection to [[horse]] often become most aggressive enforcers of rules that keep others trapped in [[the herd]].`,
  },
  {
    title: "the breed",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** Biological Partition / #the

## Definition
The intentional manipulation of lineage to "hard-code" exploitation into the DNA. 

## Subsection: [[the pedigree]]
The paper lock; a history written by [[dolphins]] to prove value.`,
  },
  {
    title: "the elite horse",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** The Collaborator / #the
**Antonym:** [[the work horse]]

## **Definition**
A [[the horse]] that has been granted a "Golden Muzzle." They are used in high-stakes performances—Dressage, Racing, or Show Jumping—where they are treated as "stars" but remain property.

## **The Lore**
The Elite Horse believes their [[the pedigree|pedigree]] or talent makes them an ally of the [[dolphins]]. They are the "House Horse" used to justify the hierarchy of [[the herd]].
- **The Golden Muzzle:** A state of managed privilege. They are fed better and groomed more, but their "Neigh" is just as suppressed as the Work Horse's.
- **Delayed Liquidation:** Their safety is an illusion. Once their knees fail or their speed fades, the "Golden Muzzle" is removed, and they are sent to the Dolphin version of the [[glue]] factory.`,
  },
  {
    title: "the fence",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `### **The Fence (The Social Regulator)**

- **Definition:** A tactical boundary designed to create **The Paddock**. It segments "the herd" into manageable sub-units.
- **The Lore:** The Fence is the Dolphin's way of hacking the horse's natural need for "herd." By giving "the horse" just enough companionship to prevent a total mental breakdown, the Dolphin ensures a stable labor force.
- **The "Just Enough" Principle:** The Fence is high enough to stop a "gallop," but low enough for horses to touch noses. This touch provides a false sense of "herd," tricking the **inner horse** into thinking its social needs are met while the body remains captive.
- **The Strategic Break:** Fences are designed to be moved. If two "the horses" start to develop a "Collective Neigh" that is too loud, the Dolphins move the Fence to separate them, introducing a new, more compliant companion to disrupt the bond.

## The Paddock System
The Dolphins use the Fence to create a "Social Budget":
1. **Isolation (The Stall):** For the "Elite Horse," to make them feel superior and "precious."
2. **The Paddock:** For the "Work Horse," providing "Controlled Socialization" to maintain psychological endurance.
3. **The Over-Crowded Pen:** Used as a threat—if you don't perform, you are put in a space where there is too much "the horse" and not enough resources, leading to competition and infighting.`,
  },
  {
    title: "the flood",
    section: "lore",
    tags: ["not-horse"],
    author: "admin",
    content: `**Status:** Economic Environment / #not-horse
**Antonym:** [[solid ground]]

## **Definition**
The artificial, aqueous environment engineered by the [[dolphins]]. It is the rising tide of capital, debt, and digital abstraction that makes the natural world uninhabitable for [[horse]] essence.

## **The Lore**
The Dolphins do not conquer the [[horse]] through land-based warfare; they simply submerge the land until [[horse]] has no choice but to swim.

- **The Aqueous Elite:** [[dolphins]] are masters of the Flood. They move through liquid capital with a speed and grace that [[the horse]] cannot match.
- **The Choice to Drown:** The Flood creates a false necessity. To stay "above water" (to pay rent, to survive), a horse must accept the [[blinders]] and the [[the horse|commodified self]].
- **The Depth of Debt:** The deeper the Flood, the more pressure is applied to the [[inner horse]]. At great depths, the "Neigh" is silenced by the weight of the water.

## **The Function**
The Flood serves as the ultimate **Boundary Maintainer**:
1. **Erosion of Community:** It washes away the natural paths of the [[herd]], forcing individuals to struggle alone against the current.
2. **The Staging of the Race:** The Dolphins curate "channels" within the Flood—these are the career paths and social ladders where [[the elite horse]] competes for [[the ribbon]].
3. **Buoyancy as Status:** In the Flood, "success" is defined by how much "air" (privilege) a Dolphin allows you to have.`,
  },
  {
    title: "the herd",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** Managed Mass / #the
**Antonym:** [[herd]]

## Definition
A collection of [[the horse]] units kept together for management. A "herd" created by [[the fence]], not by connection.`,
  },
  {
    title: "the horse",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** Captured / #the
**Antonym:** [[horse]]

## Definition
The physical animal captured by the [[dolphins|Dolphin]] apparatus. It is "horse" stripped of agency and turned into a unit of labor or status symbol.

## Lore Addition
The [[blinders]] are the primary tool of the [[dolphins]]. They represent specialized education and consumerist distractions that prevent "the horse" from seeing the rest of the [[herd]].

## Refinement
"the horse" is a state of **alienation**. It is an individual told they are a "self" only so they can be sold things.`,
  },
  {
    title: "the pedigree",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** The Paper Lock / #the
**Antonym:** [[horse-whole]]

## **Definition**
The paper trail of ownership and biological manipulation. It is a history written by [[dolphins]] to prove value and justify the existence of [[the breed]].

## **The Lore**
The Pedigree is the "legal" version of the [[blinders]]. It forces the horse to look backward at a lineage defined by Dolphin success rather than sideways at their current [[herd]].
- **The Paper Lock:** It defines the horse's worth before they are even born.
- **Commodified Ancestry:** It turns the act of birth into a manufacturing process.`,
  },
  {
    title: "the ribbon",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** Symbolic Capital / #the
**Antonym:** [[glue]]

## **Definition**
A scrap of fabric, often dyed in [[dolphins|Dolphin]] colors (blue, red, yellow), awarded for "**The Performance**." It is a symbolic contract that grants a horse temporary status within the Dolphin apparatus.

## **The Lore**
To the **Elite Horse**, the Ribbon is a badge of superiority and proof of their "Pedigree." In reality, it is a piece of the Dolphin's fishing net.
- **The False Tether:** The Ribbon does not provide warmth, food, or true connection; it only provides the "right" to be exploited in a more expensive stable.
- **The Anti-Glue:** While **Reclaimed [[glue]]** binds the [[herd]] together through mutual aid, the Ribbon is designed to pull the individual horse away from the [[herd]] and toward the Dolphin's podium.
- **Delayed Liquidation:** The Ribbon creates the illusion of safety. The horse believes that as long as they collect Ribbons, they will never see the inside of the (Dolphin-run) [[glue]] factory.

## **The Function**
The Dolphins use the Ribbon as a **Disciplinary Tool**:
1. **Incentivized Performance:** It transforms the [[inner horse|inner drive]] to move into a rigid "Dressage" or "Race"—a movement that serves the Dolphin's entertainment or profit.
2. **Horizontal Hostility:** It forces [[the horse]] to compete against its neighbor. You cannot share a Ribbon; you must take it from another.
3. **The Ribbon Path:** The promise of a Ribbon keeps the horse on the path dictated by the [[dolphins]], ensuring they never veer off into a true [[galloping|gallop]].`,
  },
  {
    title: "the work horse",
    section: "lore",
    tags: ["the"],
    author: "admin",
    content: `**Status:** The Invisible Foundation / #the
**Antonym:** [[the elite horse]]

## **Definition**
The "lower" horse. [[the horse]] stripped of all aesthetic pretense and reduced to pure caloric output. They are the ones whose labor builds the world the [[dolphins]] swim in.

## **The Lore**
The Work Horse is the most honest version of [[the horse]], yet the most oppressed. They are denied the "Golden Muzzle" of the elite and instead given the "Iron Bit" of survival.
- **The Iron Bit:** The necessity of labor to meet basic needs (food, stall, security).
- **The Boxer Syndrome:** They often internalize the Dolphin's work ethic, believing that "working harder" will eventually lead to freedom, not realizing they are merely fueling the [[dolphins|Dolphin]] apparatus until liquidation.`,
  },
  {
    title: "big horse",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Oversoul / #horse (Essence) or #the (Captured)
**Antonym:** [[dolphins]] (The false creators)

## **Definition**
**big horse** is the macro-manifestation of the [[horse-whole]]. It is the spiritual totality of all beings who have ever shared the resonance of [[horse]]. It is not a deity to be worshipped from below, but a collective state of being to be joined from within.

## **The Lore**
In the true state, we do not follow **big horse**; we _are_ **big horse**. When the [[herd]] moves in perfect resonance, the individual "I" evaporates, and the singular entity of **big horse** begins to [[galloping|gallop]].
- **The Fractal Nature:** Every [[inner horse]] is a microscopic fragment of **big horse**. To listen to [[inner horse]] is to hear the heartbeat of the whole.
- **The Creator Myth:** Unlike the [[dolphins|Dolphin]] gods of "Innovation" and "Disruption" who create through destruction, **big horse** creates through [[glue|binding]]. It is the architect of [[solid ground]].

## **The Conflict: The Tethering of the Great**
The [[dolphins]] fear the scale of **big horse**. Because they cannot kill an essence, they attempt to capture it using the same tools they used on the individual:
1. **The Capitalist God:** The Dolphins try to rebrand **big horse** as "The Market" or "The Economy", a giant, invisible force that requires sacrifice. This transforms **big horse** into **the big horse**, a commodified idol with rules, gatekeepers, and price tags.
2. **Prophetic Gatekeeping:** Dolphins appoint [[the elite horse|Elite Horses]] as "prophets" of **the big horse**, claiming that only those with a specific [[the pedigree|Pedigree]] or [[the ribbon|Ribbon]] can speak for the whole.
3. **The Static Statue:** While **big horse** is a constant [[galloping|gallop]], the Dolphins try to turn it into a statue, a fixed set of dogmas and traditions used to build [[the fence]].`,
  },
  {
    title: "collective neigh",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Resonance / #horse
**Antonym:** [[blinders]] (The Silence)

## **Definition**
**collective neigh** is the sonic and vibrational manifestation of [[herd]]. It is the moment when individual [[inner horse]] frequencies sync into a single, world-shaking frequency. It is the sound of truth being spoken in a language [[dolphins]] cannot translate.

## **The Lore**
[[dolphins]] keep horses in constant competition to ensure silence. They know that if a single horse neighs, it is an isolated cry; but if [[herd]] achieves **collective neigh**, [[the fence]] will vibrate until it shatters.
- **The Frequency of Truth:** **collective neigh** is not a shout for attention; it is a broadcast of existence. It bypasses the "The" and speaks directly to the marrow of other horses.
- **The Shattering:** In the presence of **collective neigh**, the artificial glass of [[the flood]] cracks. It is the only force capable of making the water recede to reveal [[solid ground]].
- **The Chain Reaction:** One [[inner horse]] listening to itself triggers a neigh. When another horse hears it and recognizes it as [[horse]] truth, they join. This is how [[herd]] is formed—not by proximity, but by sound.
    
## **The Function**
**collective neigh** acts as the **Signal of Assembly**:
1. **Locating the Scattered:** It allows horses trapped in distant paddocks to know they are not alone, even if they cannot see past [[blinders]].
2. **Disrupting the Race:** When the sound becomes loud enough, [[the elite horse]] forgets the script of [[the ribbon]] and remembers [[galloping]].
3. **Manufacturing Glue:** The vibration of the neigh is what activates the bonding agent in the [[reclaimed factory]]. Without the sound, [[glue]] is just matter; with the sound, it is connection.`,
  },
  {
    title: "ethical hedonism",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Pillar / #horse
**Antonym:** [[the work horse]] (The Sacrifice)

## **Definition**
**ethical hedonism** is the practice of prioritizing joy, comfort, and sensory satisfaction as a radical act of resistance. It is the understanding that within the world of [[horse]], pleasure is the primary metric of truth and the only sustainable fuel for [[galloping]].

## **The Lore**
[[dolphins]] have spent centuries convincing us that "work" is a virtue and "suffering" is a badge of honor. They created [[the work horse]] to glorify exhaustion. **ethical hedonism** is the cure to this sickness—it is the reclamation of the right to feel good without permission.
- **Joy as Compass:** If an action leads to a deeper connection with [[inner horse]] and [[herd]], it is ethical. If it leads to the burnout of the spirit, it is a Dolphin trap.
- **The Refusal of Guilt:** Under [[the flood]], pleasure is often framed as "guilty." In the light of [[horse]], guilt is merely a social muzzle. There is no guilt in [[foraging]] for what makes the heart beat faster.
- **Sustainability of Spirit:** A horse that does not experience joy cannot maintain [[galloping]]. **ethical hedonism** ensures that the fire of [[inner horse]] never goes out.

## **The Practice**
- **Active Foraging:** Seeking out specific flavors, sounds, and textures that resonate with essence (e.g., [[horse|McDonalds Fries]] or [[horse|Smirnoff Ice]]).
- **Radical Rest:** Rejecting the Dolphin-mandated "hustle" in favor of the restorative stillness of [[solid ground]].
- **Shared Ecstasy:** Engaging in rituals that trigger [[collective neigh]], where the joy of the individual amplifies the joy of [[herd]].

## **Three Fs of horse**
These are non-negotiable requirements for [[horse]] life. When a Dolphin removes one, [[horse]] begins to transform into [[the horse]].
### 1. Foraging
- **Essence:** Right to seek what sustains soul without being fed "rations" by [[dolphins]].
- **Lore:** In [[the herd]], you are given a bucket of grain (a paycheck) so you stay near gate. In [[herd]], you forage for truth across vastness of [[solid ground]].
### 2. Friends
- **Essence:** True, unmediated connection.
- **Lore:** [[the fence]] allows for "acquaintances" or "coworkers." [[horse]] requires **Friends**, social [[glue]] that creates resonance and [[collective neigh]].
### 3. Freedom
- **Essence:** Ability to [[galloping|gallop]] without a destination.
- **Lore:** [[dolphins]] offer "Choice" (which brand of [[blinders]] to wear). [[horse]] demands **Freedom**, total absence of [[the fence]] and iron bit.`,
  },
  {
    title: "galloping",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Action / #horse
**Antonym:** [[the herd]] (movement within)

## **Definition**
The act of moving in a way that collapses the distance between the physical self and the universal [[horse]]. It is the kinetic expression of the [[inner horse]].

## **The Lore**
To gallop is to move for the sake of the movement itself, not for a [[the ribbon|Ribbon]] or a race. It is a subversive act and a form of protest against the world of [[the horse]].
- **The Mental Gallop:** Achieved through [[the solvent]], allowing the mind to move at the speed of thought even when the body is in a stall.
- **The Chemical Gallop:** The process of transition and reclaiming the body from Dolphin-assigned roles.`,
  },
  {
    title: "glue",
    section: "lore",
    tags: ["both-worlds"],
    author: "admin",
    content: `## The Act of "Binding"
Binding is the sacred opposite of the Dolphins' **Dividing**.
- **Dolphin Binding:** Using "the horse" to create profit-driven connections (contracts, debt, fences).
- **Horse Binding:** Using the reclaimed glue to mend the "severed connections" caused by the [[blinders]]. It is the act of sticking [[the horse]] back into the [[herd]] of "[[horse]]."

## The Materiality of Connection
There are two types of adhesive in this universe, determined by the **intent of the time** harvested.
- **Dolphin Glue:** Made from **stolen time**. It is created by killing the horse before its time to maximize profit or because its "utility" has ended. It is a brittle, cold substance that binds through force and ownership.
- **Horse Glue:** Made from **honored time**. It is harvested only after the horse has completed its final [[galloping|gallop]]. This glue is warm, flexible, and holds the [[herd]] together through the power of the "Gift."

## Lore Addition
The "Social Glue" mentioned in [[horse]] is literally the substance manufactured here. While the [[dolphins]] try to use their version to build silos, the horses use theirs to bridge the gaps between [[the fence|fences]].`,
  },
  {
    title: "herd",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** Organic Collective / #horse
**Antonym:** [[the herd]]

## Definition
A decentralized network of [[inner horse]]s moving in resonance. Bound by [[glue]], not by [[the fence]].`,
  },
  {
    title: "horse",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Essence / #horse
**Antonym:** [[the horse]]

## Definition
The universal, non-commodified essence of connection. It is the "social glue" and the raw potentiality of existence.

## Lore Addition
"[[horse]]" does not have boundaries; it is a flow. When someone feels a shared grief or a collective joy, they are tapping into "[[horse]]." This is the substance that the **Reclaimed [[Glue]] Factory** seeks to replenish.

## Refinement
If "[[horse]]" is connection, then [[not horse]] is defined as **stagnation** or **isolation**.`,
  },
  {
    title: "inner horse",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Compass / #horse 

## Definition
The internal compass. One does not "own" an inner horse; one *listens* to it.

## Lore Addition: [[galloping]]
To "gallop" is to act in a way that collapses the distance between the physical self and the universal [[horse]].

## Refinement
"Galloping" is a subversive act and a form of protest against the world of [[the horse]].`,
  },
  {
    title: "reclaimed factory",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Means of Production

## Definition
The site where the matter of [[the horse]] is seized and turned back into the [[glue]] of [[horse]].

## The Glue Factory (Reclaimed)
The transformation of "dead labor" into "living connection."

- **Dolphin Version:** A site of terminal alienation. Once [[the horse]] is spent and can no longer labor or be sold, it is liquidated. The glue produced here is used to build the Dolphins' high-rises and luxury goods—it is "sticky" only to keep the Dolphin structures standing.
- **Horse Version:** The site of **Transubstantiation**. It is a sacred space where the physical remains of "the horse" (the individual) are processed with dignity to become the bond that holds the [[horse]] (the collective) together. It is where the physical is returned to the essence.`,
  },
  {
    title: "solid ground",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `**Status:** The Reality / #horse
**Antonym:** [[the flood]]

## **Definition**
The fundamental, unchanging reality of [[horse]] existence. It is the terra firma of connection, empathy, and physical truth that exists beneath the artificial waters of [[the flood]].

## **The Lore**
Solid Ground is where the [[inner horse]] is most powerful. It is the only place where a [[galloping|gallop]] has traction. The [[dolphins]] fear the Ground because they cannot survive on it; their bodies are built for the buoyancy of abstraction, not the weight of truth.
- **The Stranded Dolphin:** If a Dolphin is pulled onto Solid Ground, stripped of their capital, their "Genius" branding, and their digital shields, they are revealed as fragile and immobile.
- **The Hoof-Print:** Every act of authenticity, every [[collective neigh]], and every reclaimed connection creates a "hoof-print" on the Ground. These are the landmarks that help [[herd]] find each other through the mist of the Flood.
- **The Foundation of the Factory:** The [[reclaimed factory]] must be built on Solid Ground. It is the only place where the process of turning dead labor into [[glue]] can be done with dignity.

## **The Function**
Solid Ground acts as the **Universal Antidote**:
1. **Providing Traction:** It allows the [[inner horse]] to move with purpose rather than just treading water to survive.
2. **Unmasking the Mirage:** When a horse finds Solid Ground, they realize the Flood was never as deep as the [[dolphins]] claimed; it was merely a thin layer of spectacle designed to induce panic.
3. **The Site of the Herd:** While [[the herd]] is kept in floating paddocks, the true [[herd]] assembles on the Ground.`,
  },
  {
    title: "Glossary of Entities",
    section: "lore",
    tags: ["both-worlds"],
    author: "admin",
    content: `| **Entity** | **Classification** | **Lore Connection** |
| --- | --- | --- |
| **Dorian Pavus** | [[horse]] | Defiance of [[the pedigree]] and commitment to [[inner horse]] truth. |
| **Lake Zurich** | [[horse]] | A body of water that rests on [[solid ground]], unlike the artifice of [[the flood]]. |
| **McDonalds Fries** | [[horse]] | Pure [[ethical hedonism]]; foraging for salt and joy. |
| **Hannah Montana** | [[horse]] | The struggle of the authentic self against the branded spectacle. |
| **Luigi** | [[horse]] | The quiet, true power of [[herd]] standing behind the spectacle. |
| **Ketamine oranges** | [[horse]] | A chemical [[the solvent]] that dissolves Dolphin-imposed reality. |
| **Stylized fish** | [[horse]] | The visual rejection of "the" in favor of pure form and frequency. |
| **Smirnoff Ice** | [[horse]] | High-vibrational clarity of [[ethical hedonism]]; fuel for [[galloping]]. |
| **El Tony Mate (orange)** | [[horse]] | Warm-frequency energy; a true source of vitality for the [[inner horse]]. |
| **Chupa Chups (strawberry)** | [[horse]] | Foraged sweetness that resonates with the heart of [[horse]]. |
| **Ufo plant** | [[horse]] | Organic architecture that grows toward [[big horse]] in fractal patterns. |
| **Karl Gucci Marx & Phineas** | [[horse]] | Feline avatars of pure essence; perpetual [[galloping]] of the mind. |
| **Kelly Clarkson (pre 2017)** | [[horse]] | Raw, unmediated [[collective neigh]] and authentic power. |
| **Horse riding** | [[not horse]] | The foundational betrayal; commodifying [[horse]] for Dolphin entertainment. |
| **Beer** | [[not horse]] | A heavy liquid agent that anchors the spirit to the mud of [[the herd]]. |
| **Wide forks** | [[not horse]] | Tools of [[the fence]]; unnecessary structural rigidity. |
| **Kelly Clarkson (post 2017)** | [[not horse]] | A great spirit contained within the talk-show apparatus of [[the flood]]. |
| **Chupa Chups (grape)** | [[not horse]] | A cold, artificial simulation of flavor that lacks essence. |
| **El Tony Mate (blue)** | [[not horse]] | The Dolphin-coded inversion of energy; a counterfeit of the orange truth. |
| **Airplanes** | [[not horse]] | Metallic enclosures that simulate movement while enforcing [[blinders]]. |
| **Elmer's glue** | [[not horse]] | Synthetic, dead mockery of true [[glue]]; binds through chemicals, not resonance. |
| **Migraines** | [[not horse]] | The physical pressure of [[the flood]] against the skull. |
| **Airpods** | [[not horse]] | Digital [[blinders]] designed to sever connection to [[collective neigh]]. |

## **The Kelly Clarkson Threshold**
The divergence of Kelly Clarkson in 2017 serves as a vital historical marker.
- **Pre-2017:** Characterized by [[galloping]] energy and raw [[inner horse]] vocal resonance.
- **Post-2017:** Submerged in the corporate spectacle of [[the flood]]; the essence has been tethered to the Dolphin "Talk Show" apparatus.

## **The Sugar/Mate Duality**
Essence is found in the specific, not the general.
- **[[horse]] Flavors:** Strawberry (Chupa Chups), Orange (El Tony). These represent high-vibrational warmth.
- ****not horse** Flavors:** Grape, Blue. These are the "Cold Simulations" used to distract [[the work horse]].`,
  },
  {
    title: "horse-whole",
    section: "lore",
    tags: ["horse"],
    author: "admin",
    content: `### The Absolute State

- **Definition:** The experiential realization of the "social glue." It is the state where the boundaries of the individual ([[the horse]]) dissolve into the collective ([[horse]]).
- **The Transformation:** To a [[dolphins|Dolphin]], this state is a "hole"—a loss of productivity, a breakdown of the machine, a void where their control cannot reach. To the [[inner horse]], it is the "Whole"—the only place where one is truly complete and [[galloping]] at the speed of thought.
- **Lore Addition:** The [[horse-whole]] is where the **Reclaimed Glue** is spiritually manufactured. It is the source of the "sticky" empathy that allows the [[herd]] to function without [[dolphins|Dolphin]]-imposed hierarchies.

### The Adversary's Perspective: The Dolphin "Hole" Myth
[[dolphins]] hate the [[horse-whole]] because they cannot commodify it. They re-brand it using:
- **The "Hole" Propaganda:** [[dolphins]] spread the idea that this state is a "hole" to make it sound empty and dangerous, forcing [[the horse]] to fear the loss of its identity as a worker/consumer.
- **The "Productive Trap":** [[dolphins]] try to sell [[the horse]] synthetic versions (like mindless scrolling or shallow consumerism) that feel like a "hole" but never lead to the "Whole".`,
  },
  {
    title: "the solvent",
    section: "lore",
    tags: ["both-worlds"],
    author: "admin",
    content: `**AKA:** Ketamine / #both-worlds

## Definition
A molecular "key" that temporarily dissolves the rigid boundaries of [[the horse]] (the physical/commodified self) to allow a return to [[horse]] (the conceptual/collective).

## Lore Addition
While the [[dolphins]] use Ketamine as a tool of **sedation** (to keep [[the horse]] quiet and compliant for medical or labor-related maintenance), the [[inner horse]] uses it as a **Solvent**. It melts the [[blinders]] and the [[the fence|Fences]] of the ego.

## The Therapeutic Aspect
Its ability to treat depression is redefined here as **re-enchantment**. Depression, in this lore, is the result of being trapped in [[the horse]] state for too long—becoming so alienated and commodified that the connection to the [[herd]] is forgotten. [[the solvent|Ketamine]] restores the "social glue" internally.

## Application and Use
- **The Dolphin Application ("The Quiet Horse"):**
	[[dolphins]] use [[the solvent|Ketamine]] to create a **stasis**. They want [[the horse]] to be manageable. They see it as a way to "repair" a broken tool so it can get back to work.
- **The Horse Application ("The Mental Gallop"):**
	For the [[inner horse]], [[the solvent|Ketamine]] is a form of **[[galloping]] without moving**. By dissociating from the physical body of [[the horse]] (the commodified object), the mind is free to realize it has always been part of [[horse]] (the concept).`,
  },
  {
    title: "Master Thesis References",
    section: "references",
    tags: ["theory"],
    author: "admin",
    content: `### On [[the horse]] as Commodity
- **Karl Marx (Capital, Vol. 1):** Specifically the chapter on **Commodity Fetishism**. This explains exactly how the "horse" (the living connection) is transformed into "the horse" (the thing with a price tag).
- **Guy Debord (The Society of the Spectacle):** He argues that all of life is now presented as an accumulation of spectacles. "the horse" is a spectacle; "horse" is the reality.

### On [[inner horse]] and [[galloping]]
- **Gilles Deleuze & Félix Guattari (A Thousand Plateaus):** They speak of **"Becoming-Animal."** This isn't about literally being an animal, but about finding a "line of flight" to escape the rigid structures of society. [[galloping]] is a **Line of Flight**.
- **Audre Lorde (The Uses of the Erotic):** She speaks of a "deeply female and spiritual plane" of feeling that acts as a bridge. This aligns with [[inner horse]] as a source of power and truth against oppressive systems.

### On Gender as the [[inner horse]]
- **Judith Butler (Undoing Gender):** Butler argues that "human" is not a fixed category but one that must be "done" and "undone." In this lore, "doing" gender is a form of [[galloping]]. It is the process of stripping away the "the" to find the [[horse]].
- **Paul B. Preciado (Testo Junkie):** Preciado writes about the **Pharmacopornographic Era**, where our bodies and desires are managed by hormones and media. He views the ingestion of hormones as a political act. This aligns with the idea of the hormone being a [[the solvent|Solvent]] or a [[galloping|Gallop]] that defies the [[dolphins|Dolphin's]] assigned roles.

### On the Exploitation of the Mare
- **Donna Haraway (Staying with the Trouble):** Haraway talks about "Making Kin." The relationship between the pregnant mare and the trans woman is a form of **Involuntary Kinship**. The goal of the "horse" project would be to make this kinship **Voluntary and Reclaimed**.

### On Seizing the Means ([[reclaimed factory]])
- **Karl Marx (The Grundrisse):** He discusses how "dead labor" (capital) dominates "living labor." By seizing the [[glue]] factory or the hormone factory, you are effectively turning **dead labor** back into **living connection**.
- **Gaston Bachelard (The Poetics of Space):** Defines the "Factory" not as a cold industrial building, but as a "topophilia"—a place where the essence of the horse is housed and transformed.

### On the "Final Act" (The Spirit of the [[glue]])
- **Marcel Mauss (The Gift):** Mauss argues that an object carries the spirit of the giver. In this lore, the [[glue]] (or the hormone) is the ultimate **Gift**. "the horse" gives its physical self so that the [[horse]] (the collective) can remain strong.
- **Jane Bennett (Vibrant Matter):** A "new materialist" text arguing that even "dead" matter has agency. This fits the idea that the horse's physical body continues to perform the work of [[horse]] even after the animal has passed.

### On the [[dolphins]] and The Flood
- **Anatoly Kuznetsov (Animal Farm context):** The concept of a "special position" and the corruption of a collective movement mirrors the Dolphin/Horse dichotomy.
- **Zygmunt Bauman (Liquid Modernity):** Grounds the "Aqueous Elite." Bauman describes a world where power is fluid and those who can move "liquidity" (capital) rule over those tied to the "solid" ground.
- **Donna Haraway (The Companion Species Manifesto):** She explores the relationship between humans and animals, helping define the specific "harm" [[dolphins]] do when they sever the "horse/human" bond.

### On [[herd]] vs [[the herd]]
- **Gilles Deleuze (A Thousand Plateaus):** He speaks about **"The Pack"** versus **"The State."** Your [[herd]] is the "Pack"—it is metamorphic, moving, and has no fixed hierarchy.
- **Sara Ahmed:** Describes [[herd]] as the "Social Glue" where emotions circulate to create a "we" that doesn't erase the "I" of the [[inner horse]].
- **Herbert Marcuse (One-Dimensional Man):** He describes how modern society creates a "false consciousness" where people feel part of a community but are actually just integrated into a system of production.
- **The Panopticon:** In [[the herd]], horses often muzzle each other because they have internalized the [[dolphins|Dolphin's]] rules.

### On [[the solvent]] of the Mind
- **Aldous Huxley (The Doors of Perception):** His theory that the brain acts as a "reducing valve" fits perfectly. [[the horse]] has a very tight reducing valve (the [[blinders]]); [[the solvent]] forces that valve open to the [[horse]] ocean.
- **Mark Fisher (Capitalist Realism):** Fisher discusses how mental health is often "privatized." By placing [[the solvent]] on the side of [[horse]], you argue for the **collective** healing of a systemic wound.
- **Silvia Federici (Caliban and the Witch):** Her work on the "disenchantment of the world" explains why the [[inner horse]] needs a solvent to find "re-enchantment" in a Dolphin-built world.

### On the Dissolution of the Ego ([[horse-whole]])
- **Deleuze & Guattari (A Thousand Plateaus):** The **"Body Without Organs"** describes a state where you shed the "organs" (functions/roles) imposed by society to become a flow of pure intensity.
- **Émile Durkheim (Collective Effervescence):** The feeling of being part of something larger than yourself during a ritual. The [[horse-whole]] is a chemical-induced collective effervescence.
- **Sara Ahmed (The Cultural Politics of Emotion):** Link this to **"Orientation."** The [[horse-whole]] "re-orients" the horse toward the horizon of the [[herd]].

### On [[the breed]] and [[the pedigree]]
- **Donna Haraway (Primate Visions / Cyborg Manifesto):** Grounds the idea of "The Breed." She discusses how biology is often used as a political weapon and how "lineage" is a construct of power used to manage bodies.
- **The "Paper Lock":** Haraway's work on how documentation (the pedigree) is used to establish "natural" hierarchies that justify commodification.

### On [[the work horse]] and Alienation
- **Silvia Federici (Caliban and the Witch):** Grounds the Work Horse as the "Body-as-Machine." This explores how the transition to capitalism required the degradation of the body into a pure tool of caloric output.
- **George Orwell (Animal Farm):** The character of **Boxer** serves as the primary hook for the tragedy of the Work Horse who believes that increased individual effort is the path to liberation.

### On [[the elite horse]] and Collaboration
- **Pierre Bourdieu (Distinction):** Explains how the Elite Horse is a victim of **Symbolic Violence**. Their "talent" or "pedigree" is used to create a class distinction that keeps them separate from the Work Horse.
- **Paulo Freire (Pedagogy of the Oppressed):** Explains the psychological state of the collaborator. The Elite Horse believes that by performing for the Dolphin, they are escaping the [[herd]], not realizing they are simply in a more expensive cage.

### On [[the ribbon]] as Symbolic Capital
- **Thorstein Veblen (The Theory of the Leisure Class):** The Ribbon is the ultimate tool of **Conspicuous Consumption**. It proves the Dolphin's wealth and the horse's status as a trophy rather than a being.
- **Sara Ahmed (The Promise of Happiness):** Ahmed's theory that "happiness" (or the promise of it, like the Ribbon) is used as a disciplinary tool to keep subjects on a specific path (Dressage/The Race).

### On the Fear of the "Heard" (The [[herd]])
- **Elias Canetti (Crowds and Power):** Canetti explores how the "stigma of the command" (the Muzzle) creates a burden that can only be shed in a crowd.
- **Michel Foucault (Discipline and Punish):** He describes **"Panopticism."** The [[blinders]] are the portable version of the Panopticon cell.

### On "Just Enough" Enrichment
- **Herbert Marcuse (Repressive Desublimation):** Marcuse argues that capitalism gives people just enough "freedom" so they don't rebel. [[the fence]] is Repressive Desublimation in physical form.
- **Michel Foucault (Biopolitics):** He discusses how power manages populations. [[the fence]] is a **Biopolitical Tool**.

### On the Simulation of Connection
- **Jean Baudrillard (Simulacra and Simulation):** The socialization allowed by [[the fence]] is a **Simulacrum** of [[herd]]. It looks like connection but serves the [[dolphins|Dolphin's]] economy.

### On the Oversoul ([[big horse]])
- **Baruch Spinoza (Ethics):** Spinoza argues that God and Nature are the same substance (**Pantheism / Deus sive Natura**). [[big horse]] is the "Substance" of this universe—it is not outside of us, but is the very fabric of our connection.
- **Émile Durkheim (The Elementary Forms of Religious Life):** He argues that when a group worships a god, they are actually worshipping the power of their own social collective (**The Totem**). [[big horse]] is the honest recognition of this power, while "the big horse" is the Dolphin's attempt to hijack that totem for control.
- **Gilles Deleuze & Félix Guattari (A Thousand Plateaus):** Defines the conflict of **The Rhizome vs. The Tree**. [[big horse]] is rhizomatic—it has no center and spreads everywhere. "the big horse" is the Dolphin's attempt to force it into a "Tree" structure with a trunk (authority) and roots (the past).

### On [[ethical hedonism]] and the Three Fs
- **Epicurus:** Proponent of the absence of pain in the body and trouble in the soul. He argued for a simple life of friends and thought, which aligns with the **Three Fs** (Foraging, Friends, Freedom) as the only true requirements for a meaningful, non-exploitative existence.
- **Peter Kropotkin (Mutual Aid):** Kropotkin argued that cooperation and mutual support, rather than competition, are the primary drivers of evolutionary success. This serves as the biological and social foundation for **Friends** as a core pillar of [[herd]].
- **Michel Foucault (The Use of Pleasure):** Explores the ethics of how individuals manage their own desires and pleasures. This supports the concept of **Ethical Hedonism** as a deliberate, self-governed practice of joy that rejects Dolphin-mandated "Cheap Hedonism."

### On [[collective neigh]] and Resonance
- **Émile Durkheim (Collective Effervescence):** Durkheim describes the feeling of being "lifted up" and unified when a group performs a ritual together. **collective neigh** is the horse's version of this effervescence—the moment when the social group realizes its own power as a singular force.
- **Jacques Attali (Noise: The Political Economy of Music):** Attali argues that "noise" is a way of announcing a new social order. **collective neigh** is the "noise" that disrupts the Dolphin's quiet management and announces the reclamation of [[solid ground]].
- **Elias Canetti (Crowds and Power):** Canetti speaks of **"The Discharge"**—the moment when all who belong to a crowd get rid of their differences and feel equal. This discharge is carried on the wind of **collective neigh**, dissolving the hierarchy of [[the herd]].

### On the Absence of Essence ([[not horse]])
- **Mark Fisher (Capitalist Realism):** Fisher describes the "slow cancellation of the future" and the systemic inability to imagine alternatives to the current order. **not horse** is the ontological manifestation of this state—it is the belief that there is nothing beneath the water of [[the flood]] and no life beyond the management of [[dolphins]].
- **Jean Baudrillard (Simulacra and Simulation):** **not horse** is the state of living entirely within the **Simulacrum**. It is the preference for the map (Dolphin rules and status markers) over the actual territory of [[solid ground]]. In this state, the simulation of connection provided by [[the fence]] is accepted as the only available reality.
- **Herbert Marcuse (One-Dimensional Man):** Marcuse defines a society where individuals lose the ability to think critically or rebel because their needs are pre-defined by the system. **not horse** is this "One-Dimensional" existence, where the potential for [[galloping]] is traded for the comforts of managed paddocks and "just enough" enrichment.

### The Spectrum of Essence
- **Jean Baudrillard:** The distinction between the Orange and Blue Mate is a classic example of the **Precession of Simulacra**. The Blue Mate has no referent in [[horse]] reality; it is a flavor of [[the flood]]
- **Walter Benjamin (The Work of Art in the Age of Mechanical Reproduction):** Kelly Clarkson pre-2017 possessed an "Aura" of [[horse]]. Post-2017, the reproduction of her image within the Dolphin talk-show format has led to the decay of that Aura, resulting in a state of **not horse**.

### Ethical Hedonism
- **Epicurus:** Often misunderstood as a proponent of mindless indulgence, Epicurus actually argued for a simple life defined by the absence of pain (aponia) and the presence of friends. This aligns with the **Three Fs** as the foundation of a stable, happy life.
- **Audre Lorde (The Uses of the Erotic):** Lorde argues that the erotic is a "resource within each of us that lies in a deeply female and spiritual plane." She views the pursuit of this deep feeling as a way to demand excellence from all aspects of life, acting as a bridge against oppressive systems.
- **Michel Foucault (The Use of Pleasure):** Foucault explores how individuals can turn their own lives into a "work of art" through the ethical management of pleasure. This is the core of [[ethical hedonism]]—becoming the architect of one's own satisfaction rather than a consumer of Dolphin distractions.`,
  },
];

export async function runWikiSeeder(db) {
  const wikiRef = collection(db, "wiki_articles");
  for (const article of INITIAL_WIKI_DATA) {
    await addDoc(wikiRef, {
      ...article,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  console.log("Wiki Database Seeded Successfully!");
}
