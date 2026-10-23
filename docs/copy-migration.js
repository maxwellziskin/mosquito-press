// Replace only exact text from the original sample in saved or imported projects.
// Edited text and page design settings are retained.
const replacements = {
  "name": {
    "Small pages, big ideas": "Freezer Martini Service"
  },
  "eyebrow": {
    "MOSQUITO PRESS / ISSUE 001": "MOSQUITO RANCH SPIRITS",
    "01 / WHY WE MAKE": "MOSQUITO RANCH SPIRITS",
    "02 / COLLECT THE ORDINARY": "MOSQUITO RANCH SPIRITS",
    "03 / A RUNNING LIST": "MOSQUITO RANCH SPIRITS",
    "04 / A FRIENDLY REMINDER": "MOSQUITO RANCH SPIRITS",
    "05 / NOTES FROM SOMEWHERE": "MOSQUITO RANCH SPIRITS",
    "06 / KEEP THE PAPER MOVING": "MOSQUITO RANCH SPIRITS",
    "LITTLE PRESS / ISSUE 001": "MOSQUITO RANCH SPIRITS"
  },
  "title": {
    "SMALL\nPAGES.\nBIG\nIDEAS.": "FREEZER\nMARTINI\nSERVICE",
    "A little\nmanifesto.": "MOSQUITO\nRANCH\nSPIRITS",
    "LOOK\nCLOSER.": "FREEZER\nMARTINI\nSERVICE",
    "Things worth\nkeeping.": "MOSQUITO\nRANCH\nSPIRITS",
    "Make it\nbefore\nyou’re\nready.": "FREEZER\nMARTINI\nSERVICE",
    "Out in\nthe world.": "MOSQUITO\nRANCH\nSPIRITS",
    "PASS\nIT ON.": "FREEZER\nMARTINI\nSERVICE",
    "THE END.\nFOR NOW.": "MOSQUITO\nRANCH\nSPIRITS"
  },
  "body": {
    "One sheet of paper.\nA world of possibility.": "Mosquito Ranch Spirits",
    "You don’t need permission to make something.\n\nYou need a thought that won’t leave you alone. A few words. A photo. A scrap of something you noticed on the way home.\n\nPut it on paper. Give it a fold. Leave it somewhere it might be found.": "Freezer Martini Service",
    "The best stories are hiding\nin the things we walk past.": "Mosquito Ranch Spirits",
    "01   A sentence overheard.\n02   The color of 6:42 pm.\n03   A very good mistake.\n04   Your first terrible sketch.\n05   A place you want to return to.\n06   A question with no answer.": "",
    "Especially then.": "Mosquito Ranch Spirits",
    "A zine is a small invitation.\n\nTo look at something differently. To spend a little time inside someone else’s head. To slow down long enough to turn a page.\n\nThis page is waiting for your photographs, observations, and very specific obsessions.": "Freezer Martini Service",
    "Make a copy for a friend.\nLeave one at the coffee shop.\nTrade it for another idea.": "Mosquito Ranch Spirits",
    "Eight pages. One sheet.\nSomething that didn’t exist before.": "Freezer Martini Service"
  },
  "byline": {
    "AN INDEPENDENT LITTLE PUBLICATION": "MOSQUITO PRESS",
    "START SMALL. MAKE IT REAL.": "MOSQUITO PRESS",
    "MADE TO BE PASSED AROUND": "MOSQUITO PRESS",
    "YOUR POINT OF VIEW BELONGS HERE.": "MOSQUITO PRESS",
    "PRINT. FOLD. REPEAT.": "MOSQUITO PRESS"
  }
};
export function replaceDefaultCopy(field,text){return Object.hasOwn(replacements[field]||{},text)?replacements[field][text]:text;}
