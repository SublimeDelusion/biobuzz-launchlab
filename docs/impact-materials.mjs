// Nominal POLLEN mass rounded from 0.055 lb. The dimensionless inertia is
// trace(I)/(3 m r²) from the perforated am-5851 solid in the official STEP.
export const POLLEN = Object.freeze({mass:25, inertia:.635});
export const HIVE_CONTACT = Object.freeze({
  version:'petg-eva-v1', restitution:.65, tangentialRestitution:.15,
  reboundThreshold:.03, effectivePanelMass:.16, skinThickness:.000508
});
export const CONTACT_MODEL = Object.freeze({
  floorFriction:.45, floorRestitution:.55, floorShearReturn:.12,
  rollingResistance:.015, perimeterFriction:.2, perimeterRestitution:.35
});

// Reduced normal-impact model. The supported edge has negligible mobility.
// At midspan more impulse goes into sheet motion. Modal mass and support
// shape are estimates. Unresolved sheet vibration is lost after separation.
export function impactMaterial(p, name, along=.5) {
  if (name.includes('perimeter')) return {
    e:CONTACT_MODEL.perimeterRestitution, mu:CONTACT_MODEL.perimeterFriction,
    shear:0, threshold:.25
  };
  const key={'field floor':'tile','floor':'floor','back wall':'back','upper wall':'upper','lip':'lip'}[name];
  const override=p.materials?.[key];
  if (key==='tile') return {
    e:override?.e??CONTACT_MODEL.floorRestitution, mu:override?.mu??CONTACT_MODEL.floorFriction,
    shear:CONTACT_MODEL.floorShearReturn, threshold:.12
  };
  const shape=key==='lip'?0:Math.sin(Math.PI*along);
  const massRatio=(p.mass/1000)/HIVE_CONTACT.effectivePanelMass*shape*shape;
  const panelBounce=Math.max(0,(p.restitution-massRatio)/(1+massRatio));
  return {
    e:(override?.e??panelBounce)*(1-(p.impactDamping??0)),
    mu:override?.mu??p.wallFriction, shear:HIVE_CONTACT.tangentialRestitution,
    threshold:HIVE_CONTACT.reboundThreshold
  };
}
