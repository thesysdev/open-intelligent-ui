// Wikimedia files that are not a photo of the subject: SVGs, and maps, flags,
// logos and the like by their file name. Only whole words count, so a file for
// "Mapo tofu", "Flagstaff" or "Silicon Valley" is still a photo. A camelCase
// name ("LocatorMap.png") is split into words first.
const NOT_A_PHOTO = /\.svg|(?:^|[^a-z])(?:icon|logo|map|flag|seal|coat_of_arms|signature|diagram)s?(?![a-z])/i;

export const isPhotoFile = (url: string) => !NOT_A_PHOTO.test(url.replace(/([a-z])([A-Z])/g, "$1_$2"));
