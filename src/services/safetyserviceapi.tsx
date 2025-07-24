// Enhanced simpleSafetyService.ts with FDA side effects integration
const FDA_BASE_URL = 'https://api.fda.gov';

export interface SimpleRecall {
  product: string;
  reason: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
  recallNumber?: string;
  company?: string;
  classification?: string;
  status?: string;
}

export interface SimpleInteraction {
  warning: string;
  severity: 'caution' | 'warning' | 'serious';
  medications: string[];
  description?: string;
}

export interface SafetyScore {
  score: 'safe' | 'caution' | 'warning' | 'critical';
  message: string;
  details: string[];
}

// NEW: Side effects from FDA data
export interface SideEffectInfo {
  common: string[];
  serious: string[];
  rare: string[];
  fullDescription?: string;
  source: 'fda' | 'pattern' | 'unavailable';
}

// NEW: Enhanced drug information
export interface DrugSafetyInfo {
  name: string;
  sideEffects: SideEffectInfo;
  interactions: SimpleInteraction[];
  recalls: SimpleRecall[];
  safetyScore: SafetyScore;
  fdaApproved: boolean;
  lastUpdated: string;
}

class EnhancedSafetyService {
  
  // **ENHANCED RECALL CHECK** - Your existing method but with better error handling
  async checkForRecalls(medicationName: string): Promise<SimpleRecall[]> {
    try {
      console.log(`🔍 Checking recalls for: ${medicationName}`);
      
      const cleanName = this.cleanMedicationName(medicationName);
      
      const response = await fetch(
        `${FDA_BASE_URL}/drug/enforcement.json?search=product_description:"${cleanName}"&limit=10`,
        { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        console.log(`No recall data found for ${medicationName} (${response.status})`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.log(`No recalls found for ${medicationName}`);
        return [];
      }
      
      const recalls: SimpleRecall[] = data.results
        .map((recall: any) => ({
          product: recall.product_description || medicationName,
          reason: this.shortenReason(recall.reason_for_recall || 'Recall issued'),
          date: this.formatDate(recall.recall_initiation_date || 'Unknown date'),
          severity: this.determineSeverity(recall.classification),
          recallNumber: recall.recall_number || 'Unknown',
          company: recall.recalling_firm || 'Unknown',
          classification: recall.classification || 'Unknown',
          status: recall.status || 'Ongoing'
        }))
        .filter((recall: SimpleRecall) => this.isRecentRecall(recall.date))
        .slice(0, 5);
      
      console.log(`Found ${recalls.length} recent recalls for ${medicationName}`);
      return recalls;
      
    } catch (error) {
      console.error('Recall check error:', error);
      return [];
    }
  }

  // **NEW: GET SIDE EFFECTS FROM FDA** - Extract from drug labeling
  async getSideEffectsFromFDA(medicationName: string): Promise<SideEffectInfo> {
    try {
      console.log(`💊 Getting FDA side effects for: ${medicationName}`);
      
      const cleanName = this.cleanMedicationName(medicationName);
      
      // Try multiple search strategies
      const searchQueries = [
        `openfda.brand_name:"${cleanName}"`,
        `openfda.generic_name:"${cleanName}"`,
        `openfda.substance_name:"${cleanName}"`
      ];
      
      for (const query of searchQueries) {
        try {
          const response = await fetch(
            `${FDA_BASE_URL}/drug/label.json?search=${query}&limit=1`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              return this.extractSideEffectsFromLabel(data.results[0]);
            }
          }
        } catch (error) {
          console.log(`Search query failed: ${query}`);
          continue;
        }
      }
      
      // Fallback to pattern-based side effects
      return this.getPatternBasedSideEffects(medicationName);
      
    } catch (error) {
      console.error('FDA side effects error:', error);
      return this.getPatternBasedSideEffects(medicationName);
    }
  }

  // **NEW: EXTRACT SIDE EFFECTS FROM FDA LABEL**
  private extractSideEffectsFromLabel(labelData: any): SideEffectInfo {
    try {
      const adverseReactions = labelData.adverse_reactions?.[0] || '';
      const warnings = labelData.warnings?.[0] || '';
      const boxedWarning = labelData.boxed_warning?.[0] || '';
      
      const common = this.parseCommonSideEffects(adverseReactions);
      const serious = this.parseSeriousSideEffects(warnings + ' ' + boxedWarning);
      const rare = this.parseRareSideEffects(adverseReactions);
      
      return {
        common,
        serious,
        rare,
        fullDescription: adverseReactions,
        source: 'fda'
      };
    } catch (error) {
      console.error('Error extracting side effects from FDA label:', error);
      return {
        common: [],
        serious: [],
        rare: [],
        source: 'unavailable'
      };
    }
  }

  // **NEW: PARSE COMMON SIDE EFFECTS**
  private parseCommonSideEffects(text: string): string[] {
    if (!text) return [];
    
    const commonKeywords = [
      'nausea', 'headache', 'dizziness', 'fatigue', 'drowsiness',
      'dry mouth', 'constipation', 'diarrhea', 'stomach upset',
      'insomnia', 'nervousness', 'weakness', 'blurred vision'
    ];
    
    const found = commonKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    // Also look for percentage mentions (common side effects are usually mentioned with percentages)
    const percentagePattern = /(\w+(?:\s+\w+)*)\s*\([^)]*[1-9]\d*%[^)]*\)/gi;
    const matches = text.match(percentagePattern);
    if (matches) {
      matches.forEach(match => {
        const effect = match.split('(')[0].trim().toLowerCase();
        if (!found.includes(effect) && effect.length < 30) {
          found.push(effect);
        }
      });
    }
    
    return found.slice(0, 8); // Limit to most relevant
  }

  // **NEW: PARSE SERIOUS SIDE EFFECTS**
  private parseSeriousSideEffects(text: string): string[] {
    if (!text) return [];
    
    const seriousKeywords = [
      'bleeding', 'liver damage', 'kidney problems', 'heart problems',
      'allergic reaction', 'severe rash', 'difficulty breathing',
      'chest pain', 'irregular heartbeat', 'seizure', 'stroke',
      'suicidal thoughts', 'severe depression', 'hallucinations'
    ];
    
    const found = seriousKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Look for "serious" or "severe" mentions
    const seriousPattern = /(serious|severe|life-threatening)\s+([^.]{10,50})/gi;
    const matches = text.match(seriousPattern);
    if (matches) {
      matches.forEach(match => {
        const effect = match.replace(/(serious|severe|life-threatening)\s+/i, '').trim();
        if (effect.length < 50 && !found.some(f => effect.toLowerCase().includes(f))) {
          found.push(effect);
        }
      });
    }
    
    return found.slice(0, 6);
  }

  // **NEW: PARSE RARE SIDE EFFECTS**
  private parseRareSideEffects(text: string): string[] {
    if (!text) return [];
    
    const rarePattern = /(rare|uncommon|infrequent)([^.]{10,100})/gi;
    const matches = text.match(rarePattern);
    const found: string[] = [];
    
    if (matches) {
      matches.forEach(match => {
        const effect = match.replace(/(rare|uncommon|infrequent)\s*/i, '').trim();
        if (effect.length < 80) {
          found.push(effect);
        }
      });
    }
    
    return found.slice(0, 4);
  }

  // **NEW: PATTERN-BASED SIDE EFFECTS** - Fallback when FDA data unavailable
  private getPatternBasedSideEffects(medicationName: string): SideEffectInfo {
    const name = medicationName.toLowerCase();
    
    // Pattern matching for common drug classes
    if (name.includes('ibuprofen') || name.includes('advil') || name.includes('motrin')) {
      return {
        common: ['stomach upset', 'nausea', 'headache', 'dizziness'],
        serious: ['stomach bleeding', 'kidney problems', 'heart issues'],
        rare: ['severe allergic reaction', 'liver problems'],
        source: 'pattern'
      };
    }
    
    if (name.includes('acetaminophen') || name.includes('tylenol')) {
      return {
        common: ['nausea', 'stomach upset'],
        serious: ['liver damage', 'severe allergic reaction'],
        rare: ['severe skin reactions'],
        source: 'pattern'
      };
    }
    
    if (name.includes('aspirin')) {
      return {
        common: ['stomach upset', 'heartburn', 'nausea'],
        serious: ['stomach bleeding', 'allergic reaction', 'hearing problems'],
        rare: ['severe bleeding', 'Reye syndrome in children'],
        source: 'pattern'
      };
    }
    
    // Add more patterns as needed...
    
    return {
      common: [],
      serious: [],
      rare: [],
      source: 'unavailable'
    };
  }

  // **ENHANCED INTERACTIONS** - Your existing method with improvements
  async checkBasicInteractions(medications: string[]): Promise<SimpleInteraction[]> {
    if (medications.length < 2) return [];
    
    console.log(`🔗 Checking interactions for: ${medications.join(', ')}`);
    
    // Enhanced interaction database with descriptions
    const knownInteractions = [
      {
        drugs: ['warfarin', 'coumadin'],
        interactsWith: ['aspirin', 'ibuprofen', 'naproxen', 'advil', 'motrin'],
        warning: 'Increased bleeding risk',
        description: 'Blood thinners combined with NSAIDs significantly increase the risk of serious bleeding, especially in the stomach and brain.',
        severity: 'serious' as const
      },
      {
        drugs: ['metformin', 'glucophage'],
        interactsWith: ['alcohol'],
        warning: 'Risk of lactic acidosis',
        description: 'Alcohol can increase the risk of lactic acidosis, a rare but serious condition.',
        severity: 'warning' as const
      },
      {
        drugs: ['lisinopril', 'enalapril', 'ace inhibitor'],
        interactsWith: ['ibuprofen', 'naproxen', 'nsaid'],
        warning: 'Reduced blood pressure control',
        description: 'NSAIDs may reduce the effectiveness of ACE inhibitors and can affect kidney function.',
        severity: 'warning' as const
      },
      {
        drugs: ['simvastatin', 'atorvastatin', 'statin'],
        interactsWith: ['grapefruit'],
        warning: 'Increased muscle damage risk',
        description: 'Grapefruit can increase statin levels in the blood, leading to muscle problems and liver damage.',
        severity: 'caution' as const
      },
      {
        drugs: ['digoxin'],
        interactsWith: ['furosemide', 'lasix'],
        warning: 'Digoxin toxicity risk',
        description: 'Diuretics can cause electrolyte imbalances that increase digoxin toxicity risk.',
        severity: 'serious' as const
      }
      // Add more interactions...
    ];
    
    const interactions: SimpleInteraction[] = [];
    const lowerMeds = medications.map(m => m.toLowerCase());
    
    for (const interaction of knownInteractions) {
      const hasPrimaryDrug = interaction.drugs.some(drug => 
        lowerMeds.some(med => med.includes(drug))
      );
      
      const hasInteractingDrug = interaction.interactsWith.some(drug => 
        lowerMeds.some(med => med.includes(drug))
      );
      
      if (hasPrimaryDrug && hasInteractingDrug) {
        const involvedMeds = medications.filter(med => 
          interaction.drugs.some(drug => med.toLowerCase().includes(drug)) ||
          interaction.interactsWith.some(drug => med.toLowerCase().includes(drug))
        );
        
        interactions.push({
          warning: interaction.warning,
          description: interaction.description,
          severity: interaction.severity,
          medications: involvedMeds
        });
      }
    }
    
    console.log(`Found ${interactions.length} potential interactions`);
    return interactions;
  }

  // **NEW: COMPREHENSIVE DRUG SAFETY INFO**
  async getComprehensiveDrugSafety(medicationName: string, allMedications: string[] = []): Promise<DrugSafetyInfo> {
    try {
      console.log(`🏥 Getting comprehensive safety info for: ${medicationName}`);
      
      const [sideEffects, recalls, interactions] = await Promise.all([
        this.getSideEffectsFromFDA(medicationName),
        this.checkForRecalls(medicationName),
        this.checkBasicInteractions([medicationName, ...allMedications])
      ]);
      
      const safetyScore = this.calculateSafetyScore(recalls, interactions, allMedications.length + 1);
      
      return {
        name: medicationName,
        sideEffects,
        interactions: interactions.filter(i => 
          i.medications.some(med => 
            med.toLowerCase().includes(medicationName.toLowerCase())
          )
        ),
        recalls,
        safetyScore,
        fdaApproved: sideEffects.source === 'fda',
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error getting comprehensive drug safety:', error);
      return {
        name: medicationName,
        sideEffects: { common: [], serious: [], rare: [], source: 'unavailable' },
        interactions: [],
        recalls: [],
        safetyScore: {
          score: 'safe',
          message: 'Safety data unavailable',
          details: ['Unable to retrieve safety information']
        },
        fdaApproved: false,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Your existing methods remain the same...
  calculateSafetyScore(
    recalls: SimpleRecall[], 
    interactions: SimpleInteraction[],
    medicationCount: number = 1
  ): SafetyScore {
    const details: string[] = [];
    let riskScore = 0;
    
    // Recall risk scoring
    const highRecalls = recalls.filter(r => r.severity === 'high').length;
    const mediumRecalls = recalls.filter(r => r.severity === 'medium').length;
    const lowRecalls = recalls.filter(r => r.severity === 'low').length;
    
    riskScore += highRecalls * 10;
    riskScore += mediumRecalls * 5;
    riskScore += lowRecalls * 2;
    
    if (highRecalls > 0) {
      details.push(`${highRecalls} high-risk recall(s) found`);
    }
    if (mediumRecalls > 0) {
      details.push(`${mediumRecalls} medium-risk recall(s) found`);
    }
    
    // Interaction risk scoring
    const seriousInteractions = interactions.filter(i => i.severity === 'serious').length;
    const warningInteractions = interactions.filter(i => i.severity === 'warning').length;
    const cautionInteractions = interactions.filter(i => i.severity === 'caution').length;
    
    riskScore += seriousInteractions * 15;
    riskScore += warningInteractions * 8;
    riskScore += cautionInteractions * 3;
    
    if (seriousInteractions > 0) {
      details.push(`${seriousInteractions} serious drug interaction(s)`);
    }
    if (warningInteractions > 0) {
      details.push(`${warningInteractions} significant interaction(s)`);
    }
    
    // Polypharmacy risk
    if (medicationCount > 5) {
      riskScore += 5;
      details.push(`Complex regimen (${medicationCount} medications)`);
    }
    
    // Determine overall safety score
    let score: SafetyScore['score'];
    let message: string;
    
    if (riskScore >= 20) {
      score = 'critical';
      message = 'Critical safety concerns require immediate attention';
    } else if (riskScore >= 10) {
      score = 'warning';
      message = 'Important safety issues detected';
    } else if (riskScore >= 5) {
      score = 'caution';
      message = 'Some safety considerations found';
    } else {
      score = 'safe';
      message = riskScore === 0 ? 'No safety issues detected' : 'Low safety risk';
    }
    
    if (details.length === 0) {
      details.push('All medications appear safe with current information');
    }
    
    return { score, message, details };
  }

  // All your existing helper methods remain the same...
  private cleanMedicationName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*(tablet|capsule|liquid|mg|mcg|\d+mg|\d+mcg).*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private shortenReason(reason: string): string {
    if (reason.length > 100) {
      return reason.substring(0, 97) + '...';
    }
    return reason;
  }
  
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }
  
  private determineSeverity(classification: string): 'high' | 'medium' | 'low' {
    if (!classification) return 'medium';
    
    const classLower = classification.toLowerCase();
    if (classLower.includes('class i') || classLower.includes('class 1')) {
      return 'high';
    } else if (classLower.includes('class ii') || classLower.includes('class 2')) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  private isRecentRecall(dateString: string): boolean {
    try {
      const recallDate = new Date(dateString);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      return recallDate >= twoYearsAgo;
    } catch {
      return true;
    }
  }
}

// Create and export enhanced instance
export const enhancedSafetyService = new EnhancedSafetyService();
export default EnhancedSafetyService;