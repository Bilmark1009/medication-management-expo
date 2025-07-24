// src/services/simpleFDAService.ts - IMPROVED VERSION
const FDA_BASE_URL = 'https://api.fda.gov';

interface SimpleDrugInfo {
  brandName: string;
  genericName: string;
  strength: string;
  manufacturer: string;
  dosageForm: string;
  displayText: string; // For better UI display
}

class SimpleFDAService {
  async searchMedications(query: string): Promise<SimpleDrugInfo[]> {
    if (query.length < 2) return [];
    
    try {
      // Try multiple search strategies for better results
      const searchQueries = [
        `openfda.brand_name:"${query}"*`,
        `openfda.generic_name:"${query}"*`,
        `openfda.brand_name:${query}*`,
      ];
      
      let allResults = [];
      
      for (const searchQuery of searchQueries) {
        try {
          const response = await fetch(
            `${FDA_BASE_URL}/drug/label.json?search=${searchQuery}&limit=20`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.results) {
              allResults.push(...data.results);
            }
          }
        } catch (e) {
          console.log('Search attempt failed:', e);
        }
      }
      
      // Process and filter results
      const processedResults = allResults
        .map((result: any) => {
          const brandName = this.getFirstValidValue(result.openfda?.brand_name);
          const genericName = this.getFirstValidValue(result.openfda?.generic_name);
          const strength = this.getFirstValidValue(result.openfda?.strength);
          const manufacturer = this.getFirstValidValue(result.openfda?.manufacturer_name);
          const dosageForm = this.getFirstValidValue(result.openfda?.dosage_form);
          
          return {
            brandName,
            genericName,
            strength,
            manufacturer,
            dosageForm,
            displayText: this.createDisplayText(brandName, genericName, strength, manufacturer)
          };
        })
        // Filter out poor quality results
        .filter((drug: SimpleDrugInfo) => 
          drug.brandName !== 'Unknown' && 
          drug.brandName.length > 1 &&
          !drug.brandName.toLowerCase().includes('unknown') &&
          drug.brandName.toLowerCase().includes(query.toLowerCase())
        )
        // Remove duplicates
        .filter((drug: SimpleDrugInfo, index: number, self: SimpleDrugInfo[]) => 
          index === self.findIndex(d => d.brandName === drug.brandName)
        )
        // Sort by relevance (exact matches first)
        .sort((a: SimpleDrugInfo, b: SimpleDrugInfo) => {
          const aExact = a.brandName.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
          const bExact = b.brandName.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
          return bExact - aExact;
        })
        // Limit to top 8 results
        .slice(0, 8);
      
      return processedResults;
      
    } catch (error) {
      console.error('FDA search error:', error);
      return [];
    }
  }
  
  // Helper function to get first valid value from array
  private getFirstValidValue(array: string[] | undefined): string {
    if (!array || !Array.isArray(array)) return 'Unknown';
    
    for (const item of array) {
      if (item && 
          typeof item === 'string' && 
          item.trim().length > 0 && 
          !item.toLowerCase().includes('unknown') &&
          item.trim() !== '.') {
        return item.trim();
      }
    }
    return 'Unknown';
  }
  
  // Create better display text
  private createDisplayText(brandName: string, genericName: string, strength: string, manufacturer: string): string {
    let display = brandName;
    
    if (genericName !== 'Unknown' && genericName !== brandName) {
      display += ` (${genericName})`;
    }
    
    if (strength !== 'Unknown') {
      display += ` • ${strength}`;
    }
    
    if (manufacturer !== 'Unknown') {
      // Shorten long manufacturer names
      const shortManufacturer = manufacturer.length > 25 
        ? manufacturer.substring(0, 25) + '...'
        : manufacturer;
      display += ` • ${shortManufacturer}`;
    }
    
    return display;
  }
}

export const simpleFDAService = new SimpleFDAService();