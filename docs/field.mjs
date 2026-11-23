// FIRST BIOBUZZ field. No student-adjustable target geometry.
// Sources: official field CAD STEP v26-27.2 and Competition Manual TU10, Figs 9-8–9-11.
const IN=.0254;
export const FIELD=Object.freeze({
 source:'https://ftc-resources.firstinspires.org/ftc/field/field-cad-step',
 manual:'https://ftc-resources.firstinspires.org/ftc/game/manual',
 version:'STEP v26-27.2 / TU10',
 pivotHeight:43.95*IN,cellTilt:30,
 // Centerline mouth edges measured from the upward blue CELL in the official STEP.
 cadLowerLip:1.35573160,cadRoofApex:1.66353992,cadDepth:.29845000,
 openingBottom:53.5*IN,openingTop:65.6*IN,
 openingHeight:14*IN,openingWidth:20*IN,depth:12*IN,
 shoulderHeight:7.61*IN,
});
export const FIELD_KEYS=['targetHeight','targetTilt','targetWidth','targetTall','targetDepth','lateral'];
export function withOfficialField(p){return {...p,targetHeight:(FIELD.cadLowerLip+FIELD.cadRoofApex)/2,targetTilt:FIELD.cellTilt,targetWidth:FIELD.openingWidth/IN,targetTall:(FIELD.cadRoofApex-FIELD.cadLowerLip)/Math.cos(FIELD.cellTilt*Math.PI/180)/IN,targetDepth:FIELD.cadDepth/IN,lateral:0};}
