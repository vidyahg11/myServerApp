export const validateJsonData = (jsonData) => {
    const errors = [];
  
    if (!jsonData.Data || !Array.isArray(jsonData.Data.radius) || jsonData.Data.radius.length !== 360) {
      errors.push('Radius array must have 360 values.');
    }
  
    if (!jsonData.Data || !Array.isArray(jsonData.Data.phi) || jsonData.Data.phi.length !== 360) {
      errors.push('Phi array must have 360 values.');
    }
  
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
  