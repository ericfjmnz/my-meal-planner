import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, User, Utensils, Target, Calendar, Venus, Mars, DollarSign, Loader2, Bot, X, Trash2, Replace, AlertTriangle, Dumbbell, PieChart, PlusCircle, MinusCircle, Briefcase, GlassWater, FileDown } from 'lucide-react';

// --- Main App Component ---
// IMPORTANT: For styles to work, ensure your main entry file (e.g., src/main.jsx or src/index.js)
// imports the main CSS file like this: `import './index.css';`

export default function App() {
    // --- State Management ---
    // Profile, workouts, and macros are now loaded from sessionStorage on initial render.
    const [profile, setProfile] = useState(() => {
        const saved = sessionStorage.getItem('userProfile');
        return saved ? JSON.parse(saved) : { 
            dob: '', 
            gender: '', 
            currentWeight: '', 
            goalWeight: '', 
            weeklyLoss: '1',
            heightFt: '',
            heightIn: '',
            activityLevel: '1.2', // Sedentary
        };
    });

    const [workouts, setWorkouts] = useState(() => {
        const saved = sessionStorage.getItem('userWorkouts');
        return saved ? JSON.parse(saved) : [];
    });

    const [macroSplit, setMacroSplit] = useState(() => {
        const saved = sessionStorage.getItem('userMacroSplit');
        return saved ? JSON.parse(saved) : { protein: 30, carbs: 40, fat: 30 };
    });

    const [isProfileSaved, setIsProfileSaved] = useState(() => {
        return sessionStorage.getItem('isProfileSaved') === 'true';
    });

    const [isProfileComplete, setIsProfileComplete] = useState(false);
    
    // Calculated Goals State
    const [nutritionGoals, setNutritionGoals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Meal Plan State
    const [mealPlan, setMealPlan] = useState({ 
        mealsPerDay: '1', 
        days: '5', 
        mealName: '', 
        mealName2: '',
        mealName3: '',
        store: '', 
        budget: '', 
        snackBeveragePreferences: '' 
    });

    // API & UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [apiResponse, setApiResponse] = useState(null);
    const [error, setError] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);


    // Ingredient editing state
    const [showReplaceModal, setShowReplaceModal] = useState(false);
    const [ingredientToReplace, setIngredientToReplace] = useState(null);
    const [newIngredient, setNewIngredient] = useState('');
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningInfo, setWarningInfo] = useState({ message: '', onConfirm: null });

    // --- Effects to save state to sessionStorage ---
    useEffect(() => {
        sessionStorage.setItem('userProfile', JSON.stringify(profile));
        const { dob, gender, currentWeight, goalWeight, heightFt, heightIn } = profile;
        setIsProfileComplete(!!(dob && gender && currentWeight && goalWeight && heightFt && heightIn));
    }, [profile]);

    useEffect(() => {
        sessionStorage.setItem('userWorkouts', JSON.stringify(workouts));
    }, [workouts]);

    useEffect(() => {
        sessionStorage.setItem('userMacroSplit', JSON.stringify(macroSplit));
    }, [macroSplit]);

    // --- Advanced Nutrition Goals Calculation ---
    useEffect(() => {
        const { dob, gender, currentWeight, weeklyLoss, heightFt, heightIn, activityLevel } = profile;
        if (!currentWeight || !gender || !dob || !heightFt || !heightIn) {
            setNutritionGoals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
            return;
        }

        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        const weightInKg = parseFloat(currentWeight) * 0.453592;
        const heightInCm = (parseFloat(heightFt) * 30.48) + (parseFloat(heightIn) * 2.54);

        const bmr = (gender === 'male')
            ? (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) + 5
            : (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) - 161;
        
        const tdee_base = bmr * parseFloat(activityLevel);
        
        const getMET = (type) => {
            const t = type.toLowerCase();
            if (t.includes('run')) return 9.8; if (t.includes('jog')) return 7.0; if (t.includes('walk')) return 3.5;
            if (t.includes('lift') || t.includes('strength')) return 5.0; if (t.includes('cycl') || t.includes('bike')) return 7.5;
            if (t.includes('yoga')) return 2.5; return 4.0;
        };

        const weeklyWorkoutCalories = workouts.reduce((total, workout) => {
            if (!workout.days || !workout.type || (!workout.duration && !workout.distance)) return total;
            const met = getMET(workout.type); let durationHours = 0;
            if (workout.distance) {
                const pace = workout.type.toLowerCase().includes('run') ? 10 : (workout.type.toLowerCase().includes('jog') ? 12 : 15);
                durationHours = (parseFloat(workout.distance) * pace) / 60;
            } else if (workout.duration) {
                durationHours = parseFloat(workout.duration) / 60;
            }
            if (durationHours > 0) {
                const caloriesPerSession = met * weightInKg * durationHours;
                return total + (caloriesPerSession * parseInt(workout.days));
            }
            return total;
        }, 0);

        const dailyWorkoutCalories = weeklyWorkoutCalories / 7;
        const totalTDEE = tdee_base + dailyWorkoutCalories;
        const calorieTarget = totalTDEE - (parseFloat(weeklyLoss) * 500);
        
        if (calorieTarget <= 0) {
            setNutritionGoals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
            return;
        }

        const proteinGrams = Math.round((calorieTarget * (macroSplit.protein / 100)) / 4);
        const carbsGrams = Math.round((calorieTarget * (macroSplit.carbs / 100)) / 4);
        const fatGrams = Math.round((calorieTarget * (macroSplit.fat / 100)) / 9);

        setNutritionGoals({ calories: Math.round(calorieTarget), protein: proteinGrams, carbs: carbsGrams, fat: fatGrams });

    }, [profile, workouts, macroSplit]);

    // --- Event Handlers ---
    const handleProfileChange = (e) => setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleMealPlanChange = (e) => setMealPlan(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleWorkoutChange = (index, e) => {
        const newWorkouts = [...workouts];
        const { name, value } = e.target;
        const currentWorkout = { ...newWorkouts[index], [name]: value };
        if (name === 'type') {
            const isDistance = value.toLowerCase().includes('run') || value.toLowerCase().includes('walk') || value.toLowerCase().includes('jog');
            if (isDistance) { delete currentWorkout.duration; currentWorkout.distance = currentWorkout.distance || '3'; } 
            else { delete currentWorkout.distance; currentWorkout.duration = currentWorkout.duration || '45'; }
        }
        newWorkouts[index] = currentWorkout;
        setWorkouts(newWorkouts);
    };

    const handleMacroChange = (e) => {
        const { name, value } = e.target;
        const newValue = parseInt(value, 10);
        const oldSplit = { ...macroSplit };
        const diff = newValue - oldSplit[name];
        
        let others = Object.keys(oldSplit).filter(k => k !== name);
        let other1Key = others[0];
        let other2Key = others[1];

        let other1Value = oldSplit[other1Key];
        let other2Value = oldSplit[other2Key];

        // This logic ensures the total remains 100% while adjusting other sliders proportionally.
        if (other1Value + other2Value > 0) {
            other1Value -= Math.round(diff * (other1Value / (other1Value + other2Value)));
        } else { // Handle case where other two sliders are at 0
            other1Value -= Math.floor(diff / 2);
        }
        other2Value = 100 - newValue - other1Value;

        if (other1Value < 10 || other2Value < 10 || newValue < 10) return; // Prevent going below min

        setMacroSplit({
            [name]: newValue,
            [other1Key]: other1Value,
            [other2Key]: other2Value,
        });
    };

    const addWorkout = () => setWorkouts([...workouts, { type: '', days: '', duration: '' }]);
    const removeWorkout = (index) => setWorkouts(workouts.filter((_, i) => i !== index));

    const saveProfile = () => {
        setIsLoading(true);
        // Set flag in session storage
        setTimeout(() => {
            sessionStorage.setItem('isProfileSaved', 'true');
            setIsProfileSaved(true);
            customAlert('Profile confirmed for this session!');
            setIsLoading(false);
        }, 500);
    };

    const customAlert = (message) => {
        const alertBox = document.getElementById('alert-box');
        const alertMessage = document.getElementById('alert-message');
        if (alertBox && alertMessage) {
            alertMessage.innerText = message;
            alertBox.classList.remove('hidden');
            setTimeout(() => { alertBox.classList.add('hidden'); }, 3000);
        }
    };
    
    const callGeminiAPI = async (payload) => {
        const apiKey = "AIzaSyAsb7lrYNWBzSIUe5RUCOCMib20FzAX61M"; // API Key is handled by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            let errorMessage = "The AI returned an unexpected response.";
            if (result.promptFeedback?.blockReason) {
                errorMessage += ` Reason: ${result.promptFeedback.blockReason}`;
            }
            console.error("Unexpected API response structure:", result);
            throw new Error(errorMessage);
        }
    };
    
    const generateOrRecalculatePlan = async (existingGroceryList = null) => {
        if (!isProfileSaved && !existingGroceryList) { customAlert("Please save your profile first!"); return; }
        existingGroceryList ? setIsRecalculating(true) : setIsLoading(true);
        setError('');
        
        const { dob, gender, currentWeight, goalWeight, weeklyLoss, heightFt, heightIn, activityLevel } = profile;
        const { mealsPerDay, days, mealName, mealName2, mealName3, store, budget, snackBeveragePreferences } = mealPlan;
        const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 30;
        
        const activityLevelText = { '1.2': 'Sedentary', '1.375': 'Lightly Active', '1.55': 'Moderately Active', '1.725': 'Very Active', '1.9': 'Extremely Active' };
        const workoutsDescription = workouts.map(w => {
            if (!w.type) return '';
            const daysText = `${w.days} day${w.days > 1 ? 's' : ''}/week`;
            if (w.distance) return `${w.type} for ${w.distance} miles, ${daysText}`;
            if (w.duration) return `${w.type} for ${w.duration} mins, ${daysText}`;
            return '';
        }).filter(Boolean).join('; ') || 'None specified';

        let mealStructureInstruction = '';
        if (mealsPerDay === '1') {
            mealStructureInstruction = `**Meal Structure:** The user wants One Meal a Day (OMAD). Generate a single, large recipe for "${mealName}" to meet the entire daily nutritional target. State that the recipe is for the full day's goal. Do NOT suggest snacks or other meals.`;
        } else {
            const mealIdeas = [`Meal 1 Idea: ${mealName || 'Chef\'s Choice'}`];
            if (mealsPerDay > 1 && mealName2) mealIdeas.push(`Meal 2 Idea: ${mealName2}`);
            if (mealsPerDay > 2 && mealName3) mealIdeas.push(`Meal 3 Idea: ${mealName3}`);
            mealStructureInstruction = `**Meal Structure:** The user wants ${mealsPerDay} meals per day. Create a full day's meal plan based on these ideas: ${mealIdeas.join(', ')}. Suggest healthy, complementary recipes for any meals where the user didn't provide an idea. ${snackBeveragePreferences ? `Incorporate snacks and beverages based on the user's preference for '${snackBeveragePreferences}'.` : 'You can optionally include one or two healthy snacks.'} The combined nutrition of all meals and snacks must meet the daily target.`;
        }
        
        let budgetInstruction = `Budget: ${budget ? `Under $${budget}.` : 'No budget specified.'}`;
        if (budget) {
            budgetInstruction += ` If this budget is not feasible, find the cheapest possible option and state in the plan summary that the budget was exceeded.`;
        }


        const promptAction = existingGroceryList ? `The user has modified their grocery list. Please recalculate the meal plan based on this *new list*. Update the instructions and nutritional info to match. The user's original goals and meal structure preference remain the same.` : `Based on ALL the user information, please generate a detailed meal plan.`;
        const groceryListText = existingGroceryList ? `\n\nHere is the updated grocery list to use:\n${JSON.stringify(existingGroceryList)}` : '';

        const prompt = `
            You are an expert nutrition and meal planning assistant.
            **User Profile & Goals:**
            - Age: ${age}, Gender: ${gender}
            - Current Weight: ${currentWeight} lbs, Goal Weight: ${goalWeight} lbs
            - Height: ${heightFt}' ${heightIn}"
            - Daily Activity/Job: ${activityLevelText[activityLevel]}
            - Workouts: ${workoutsDescription}
            - Desired Weekly Weight Loss: ${weeklyLoss} lbs/week
            - Daily Calorie Target: ~${nutritionGoals.calories} calories.
            - Daily Macros: ~${nutritionGoals.protein}g Protein (${macroSplit.protein}%), ~${nutritionGoals.carbs}g Carbs (${macroSplit.carbs}%), ~${nutritionGoals.fat}g Fat (${macroSplit.fat}%).

            **User Request:**
            - Meal Plan for: ${days} days
            - Store: ${store || 'any major grocery store'}, ${budgetInstruction}

            ${mealStructureInstruction}
            **Action:** ${promptAction}${groceryListText}
            
            **Output:** Respond ONLY with structured text using these exact section headers in brackets: [PLAN SUMMARY], [GROCERY LIST], [INSTRUCTIONS], [NUTRITION], [TOTAL COST].
            For [GROCERY LIST], each item must list the **total quantity needed for the entire ${days}-day plan** and be on a new line in the format: id: value; name: value; quantity: value; price: value.
            For [INSTRUCTIONS], use markdown subheadings (e.g., ### Breakfast, ### Lunch) to separate the details for each meal. **At the end of the instructions for each cooked meal, add a "### Portioning" subsection explaining how to divide the total cooked food to create single servings.**
            For [NUTRITION], use markdown subheadings to detail the nutrition for each meal and a final ### Total line for the day's combined nutrition.
            For [TOTAL COST], provide just the number.
            
            **IMPORTANT:** For all ingredient quantities, use imperial units (e.g., lbs, oz, cups, tbsp), not metric units.
        `;
        
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        try {
            const responseText = await callGeminiAPI(payload);
            if (!responseText) {
                 throw new Error("AI returned an empty response. Please try generating the plan again.");
            }
            
            const parseSection = (sectionName, text) => {
                const regex = new RegExp(`\\[${sectionName}\\]([\\s\\S]*?)(?=\\[|$)`);
                const match = text.match(regex);
                return match ? match[1].trim() : '';
            };

            const planSummary = parseSection('PLAN SUMMARY', responseText);
            const groceryListText = parseSection('GROCERY LIST', responseText);
            const instructions = parseSection('INSTRUCTIONS', responseText);
            const nutritionText = parseSection('NUTRITION', responseText);
            const totalCostText = parseSection('TOTAL COST', responseText);

            if (!planSummary || !groceryListText || !instructions || !nutritionText || !totalCostText) {
                throw new Error("AI response was missing one or more required sections.");
            }

            const groceryList = groceryListText.split('\n').map((line, index) => {
                const parts = line.split(';').reduce((acc, part) => {
                    const [key, ...value] = part.split(':');
                    if (key && value.length > 0) acc[key.trim()] = value.join(':').trim();
                    return acc;
                }, {});
                if (!parts.id) parts.id = `ing-${Date.now()}-${index}`;
                if (parts.name) {
                    const priceValue = parts.price ? parseFloat(String(parts.price).replace(/[^0-9.-]+/g,"")) : 0;
                    return { ...parts, price: priceValue || 0 };
                }
                return null;
            }).filter(Boolean);

            const nutrition = {
                details: nutritionText.replace(/\n/g, '<br />')
            };

            const totalCost = parseFloat(totalCostText) || 0;

            const parsedResponse = { planSummary, groceryList, instructions, nutrition, totalCost };

            setApiResponse(parsedResponse);
            if (!existingGroceryList) setShowPlanModal(true);
        } catch (apiError) {
            console.error("Gemini API Error or Parsing Error:", apiError);
            setError(`Failed to get meal plan. The AI may have returned an invalid format. Details: ${apiError.message}`);
        } finally {
            setIsLoading(false);
            setIsRecalculating(false);
        }
    };

    const handleRemoveIngredient = (idToRemove) => {
        const updatedList = apiResponse.groceryList.filter(ing => ing.id !== idToRemove);
        generateOrRecalculatePlan(updatedList);
    };

    const handleStartReplace = (ingredient) => {
        setIngredientToReplace(ingredient);
        setShowReplaceModal(true);
    };

    const handleConfirmReplace = async () => {
        if (!newIngredient || !ingredientToReplace) return;
        
        setIsRecalculating(true);
        setShowReplaceModal(false);

        const prompt = `A user wants to replace '${ingredientToReplace.name}' with '${newIngredient}'. Will this significantly alter the nutritional profile or taste? Respond ONLY with text in this exact format on separate lines:\nimpact: low | high\nwarning: Brief explanation.`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        try {
            const responseText = await callGeminiAPI(payload);
            if (!responseText) {
                 throw new Error("AI evaluation returned an empty response.");
            }

            const lines = responseText.split('\n');
            const impactLine = lines.find(l => l.startsWith('impact:'));
            const warningLine = lines.find(l => l.startsWith('warning:'));

            const impact = impactLine ? impactLine.split(':')[1].trim() : 'low';
            const warning = warningLine ? warningLine.split(':').slice(1).join(':').trim() : 'No specific warning.';

            const performReplacement = () => {
                const updatedList = apiResponse.groceryList.map(ing => 
                    ing.id === ingredientToReplace.id ? { ...ing, name: newIngredient, price: 0 } : ing
                );
                generateOrRecalculatePlan(updatedList);
                setNewIngredient('');
                setIngredientToReplace(null);
            };

            if (impact === 'high') {
                setWarningInfo({ message: warning, onConfirm: performReplacement });
                setShowWarningModal(true);
            } else {
                performReplacement();
            }
        } catch (apiError) {
            console.error("Gemini Eval Error or Parsing Error:", apiError);
            setError(`Could not evaluate replacement. Details: ${apiError.message}`);
        } finally {
             setIsRecalculating(false);
        }
    };
    
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(script);
        });
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        setError('');
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            const element = document.getElementById('plan-to-print');
            const opt = {
                margin:       0.5,
                filename:     'MyMealPlan.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            await html2pdf().from(element).set(opt).save();
        } catch (e) {
            console.error('Download error:', e);
            setError('Could not download PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };
    
    const budgetStoreLogicError = (mealPlan.budget && !mealPlan.store) || (!mealPlan.budget && mealPlan.store);
    
    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
            <div id="alert-box" className="hidden fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50"><p id="alert-message"></p></div>
            {error && <div className="fixed top-5 right-5 bg-red-500 text-white py-2 px-4 rounded-lg shadow-lg z-50" onClick={() => setError('')}>{error}</div>}
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center"><Bot className="w-8 h-8 text-blue-600 mr-3" /><h1 className="text-2xl font-bold text-slate-800 tracking-tight">AI Meal Planner</h1></div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    
                    <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-md space-y-4">
                        <h2 className="text-xl font-semibold flex items-center"><User className="mr-2 text-blue-600"/>Your Profile & Goals</h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                    <Calendar className="w-5 h-5 mr-2 text-slate-500"/> Date of Birth
                                </label>
                                <input type="date" name="dob" value={profile.dob} onChange={handleProfileChange} className="w-full border rounded-lg p-2 bg-slate-50"/>
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                    {profile.gender === 'female' ? <Venus className="w-5 h-5 mr-2 text-slate-500"/> : <Mars className="w-5 h-5 mr-2 text-slate-500"/>} Gender
                                </label>
                                <select name="gender" value={profile.gender} onChange={handleProfileChange} className="w-full border rounded-lg p-2 bg-slate-50">
                                    <option value="">Select...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Height</label>
                                <div className="flex gap-4">
                                    <input type="number" name="heightFt" value={profile.heightFt} onChange={handleProfileChange} placeholder="ft" className="w-full border rounded-lg p-2 bg-slate-50"/>
                                    <input type="number" name="heightIn" value={profile.heightIn} onChange={handleProfileChange} placeholder="in" className="w-full border rounded-lg p-2 bg-slate-50"/>
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                    <Wrench className="w-5 h-5 mr-2 text-slate-500"/> Current Weight (lbs)
                                </label>
                                <input type="number" name="currentWeight" value={profile.currentWeight} onChange={handleProfileChange} placeholder="e.g., 180" className="w-full border rounded-lg p-2 bg-slate-50"/>
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                    <Target className="w-5 h-5 mr-2 text-slate-500"/> Goal Weight (lbs)
                                </label>
                                <input type="number" name="goalWeight" value={profile.goalWeight} onChange={handleProfileChange} placeholder="e.g., 160" className="w-full border rounded-lg p-2 bg-slate-50"/>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Weekly Weight Loss Goal</label>
                            <select name="weeklyLoss" value={profile.weeklyLoss} onChange={handleProfileChange} className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="0.5">0.5 lbs per week</option>
                                <option value="1">1 lb per week (recommended)</option>
                                <option value="1.5">1.5 lbs per week</option>
                                <option value="2">2 lbs per week</option>
                            </select>
                        </div>
                        
                        <div className="pt-4 border-t">
                             <h3 className="text-lg font-semibold flex items-center mb-2"><Dumbbell className="mr-2 text-blue-600"/>Activity & Workouts</h3>
                             <div>
                                <label className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                    <Briefcase className="w-5 h-5 mr-2 text-slate-500"/> Daily Activity Level / Job
                                </label>
                                <select name="activityLevel" value={profile.activityLevel} onChange={handleProfileChange} className="w-full border rounded-lg p-2 bg-slate-50">
                                    <option value="1.2">Sedentary</option>
                                    <option value="1.375">Lightly Active</option>
                                    <option value="1.55">Moderately Active</option>
                                    <option value="1.725">Very Active</option>
                                    <option value="1.9">Extremely Active</option>
                                </select>
                            </div>
                             
                             <div className="mt-4 space-y-2">
                                 <div className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center text-xs text-slate-500 px-2">
                                     <label>Workout Type</label>
                                     <label className="text-center w-20">Days/wk</label>
                                     <label className="text-center w-20">Time</label>
                                     <span className="w-8"></span> {/* Placeholder for button width */}
                                 </div>
                                 {workouts.map((w, index) => {
                                     const isDistanceWorkout = w.type.toLowerCase().includes('run') || w.type.toLowerCase().includes('walk') || w.type.toLowerCase().includes('jog');
                                     return (
                                      <div key={index} className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center">
                                           <input type="text" name="type" value={w.type} onChange={(e) => handleWorkoutChange(index, e)} placeholder="e.g., Running" className="w-full border rounded-lg p-2 bg-slate-50"/>
                                           <input type="number" name="days" value={w.days || ''} onChange={(e) => handleWorkoutChange(index, e)} title="Days per week" className="w-20 border rounded-lg p-2 bg-slate-50 text-center"/>
                                           {isDistanceWorkout ? (<input type="number" name="distance" value={w.distance || ''} onChange={(e) => handleWorkoutChange(index, e)} title="Miles per session" placeholder="miles" className="w-20 border rounded-lg p-2 bg-slate-50 text-center"/>) : (<input type="number" name="duration" value={w.duration || ''} onChange={(e) => handleWorkoutChange(index, e)} title="Minutes per session" placeholder="mins" className="w-20 border rounded-lg p-2 bg-slate-50 text-center"/>)}
                                           <button onClick={() => removeWorkout(index)} className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 justify-self-center"><MinusCircle size={16}/></button>
                                       </div>)})}
                                  <button onClick={addWorkout} className="flex items-center gap-2 text-sm bg-blue-600 text-white hover:bg-blue-700 font-semibold px-3 py-1 rounded-lg"><PlusCircle size={16}/>Add Workout</button>
                             </div>
                        </div>
                        <button onClick={saveProfile} disabled={!isProfileComplete || isLoading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 flex items-center justify-center">{isLoading ? <Loader2 className="animate-spin" /> : 'Save Profile'}</button>
                    
                        <div className="pt-4 border-t">
                            <h3 className="text-lg font-semibold flex items-center mb-2"><PieChart className="mr-2 text-blue-600"/>Your Daily Nutrition Goals</h3>
                            {nutritionGoals.calories > 0 ? (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="text-center"> <p className="text-sm text-slate-500">Calories</p> <p className="text-3xl font-bold text-blue-600">{nutritionGoals.calories.toLocaleString()}</p></div>
                                    <div className="space-y-2 mt-4">
                                        <div> <label className="flex justify-between text-sm font-medium"><span>Protein</span><span>{macroSplit.protein}%</span></label> <input type="range" min="10" max="70" name="protein" value={macroSplit.protein} onChange={handleMacroChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-blue-500"/></div>
                                        <div> <label className="flex justify-between text-sm font-medium"><span>Carbs</span><span>{macroSplit.carbs}%</span></label> <input type="range" min="10" max="70" name="carbs" value={macroSplit.carbs} onChange={handleMacroChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-green-500"/></div>
                                        <div> <label className="flex justify-between text-sm font-medium"><span>Fat</span><span>{macroSplit.fat}%</span></label> <input type="range" min="10" max="70" name="fat" value={macroSplit.fat} onChange={handleMacroChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-yellow-500"/></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t text-center">
                                        <div><p className="text-sm text-slate-500">Protein</p><p className="text-lg font-semibold">{nutritionGoals.protein}g</p></div>
                                        <div><p className="text-sm text-slate-500">Carbs</p><p className="text-lg font-semibold">{nutritionGoals.carbs}g</p></div>
                                        <div><p className="text-sm text-slate-500">Fat</p><p className="text-lg font-semibold">{nutritionGoals.fat}g</p></div>
                                    </div>
                                </div>
                            ) : (<div className="bg-slate-50 p-4 rounded-lg text-center text-slate-500"><p>Please complete your profile to see your nutrition goals.</p></div>)}
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md space-y-4">
                        <h2 className="text-xl font-semibold flex items-center"><Utensils className="mr-2 text-blue-600"/>Create Your Plan</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Meals Per Day</label>
                                <select name="mealsPerDay" value={mealPlan.mealsPerDay} onChange={handleMealPlanChange} className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none"><option value="1">One (OMAD)</option><option value="2">Two</option><option value="3">Three</option></select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Number of Days</label>
                                <select name="days" value={mealPlan.days} onChange={handleMealPlanChange} className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none">{[...Array(7).keys()].map(i => <option key={i+1} value={i+1}>{i+1} Day(s)</option>)}</select>
                            </div>
                        </div>
                        
                        {mealPlan.mealsPerDay === '1' ? (
                             <div><label className="block text-sm font-medium text-slate-600 mb-1">Main Meal Idea</label><input type="text" name="mealName" value={mealPlan.mealName} onChange={handleMealPlanChange} placeholder="e.g., Salmon and Asparagus" className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none"/></div>
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-600">Meal Ideas</label>
                                <input type="text" name="mealName" value={mealPlan.mealName} onChange={handleMealPlanChange} placeholder="Meal 1 Idea" className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none"/>
                                {mealPlan.mealsPerDay > 1 && <input type="text" name="mealName2" value={mealPlan.mealName2} onChange={handleMealPlanChange} placeholder="Meal 2 Idea" className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none"/>}
                                {mealPlan.mealsPerDay > 2 && <input type="text" name="mealName3" value={mealPlan.mealName3} onChange={handleMealPlanChange} placeholder="Meal 3 Idea" className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none"/>}
                            </div>
                        )}
                        
                        <div>
                            <label className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                <GlassWater className="w-5 h-5 mr-2 text-slate-500"/> Snacks / Beverages (optional)
                            </label>
                            <input type="text" name="snackBeveragePreferences" value={mealPlan.snackBeveragePreferences} onChange={handleMealPlanChange} placeholder="e.g., Protein shake, coffee" className="w-full border rounded-lg p-2 bg-slate-50"/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Grocery Store</label>
                                <input type="text" name="store" value={mealPlan.store} onChange={handleMealPlanChange} placeholder="e.g., Walmart" className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none"/>
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                    <DollarSign className="w-5 h-5 mr-2 text-slate-500"/> Budget
                                </label>
                                <input type="number" name="budget" value={mealPlan.budget} onChange={handleMealPlanChange} placeholder="e.g., 100" className="w-full border rounded-lg p-2 bg-slate-50"/>
                            </div>
                        </div>
                        {budgetStoreLogicError && <p className="text-xs text-center text-red-500">Please provide both Budget and Store, or leave both empty.</p>}
                        <button onClick={() => generateOrRecalculatePlan()} disabled={isLoading || !isProfileSaved || budgetStoreLogicError} className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 flex items-center justify-center">{isLoading ? <Loader2 className="animate-spin" /> : 'Generate My Plan!'}</button>
                        {!isProfileSaved && <p className="text-xs text-center text-red-500">Please save your profile first.</p>}
                    </div>
                </div>
            </main>

            {/* --- Modals --- */}
            {showPlanModal && apiResponse && ( <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-30 p-4"> <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"> <div className="p-4 border-b flex justify-between items-center"><h3 className="text-lg font-bold">Your AI-Curated Meal Plan</h3><button onClick={() => setShowPlanModal(false)} className="p-1 rounded-full hover:bg-slate-200"><X className="w-5 h-5"/></button></div> <div className="p-6 overflow-y-auto relative" id="plan-to-print"> {isRecalculating && <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>} <div className="prose lg:prose-lg max-w-none"> <p>{apiResponse.planSummary}</p> 
            {mealPlan.budget && apiResponse.totalCost > mealPlan.budget && (
                <p className="text-red-600 font-bold my-2">
                    Note: This plan exceeds your specified budget of ${mealPlan.budget}, but it's the most affordable option found that meets your nutritional goals.
                </p>
            )}
            <h3>Grocery List (Total Est: ${apiResponse.totalCost?.toFixed(2)})</h3> <ul className="list-none p-0"> {apiResponse.groceryList?.map(ing => ( <li key={ing.id} className="flex items-center justify-between p-2 border-b"> <span>{ing.name} ({ing.quantity}) - <strong>${ing.price?.toFixed(2)}</strong></span> <div className="flex items-center gap-2"> <button onClick={() => handleStartReplace(ing)} title="Replace" className="meal-plan-btn replace-btn"><Replace size={18}/></button> <button onClick={() => handleRemoveIngredient(ing.id)} title="Remove" className="meal-plan-btn remove-btn"><Trash2 size={18}/></button> </div> </li> ))} </ul> <h3>Instructions</h3> <p dangerouslySetInnerHTML={{ __html: apiResponse.instructions?.replace(/###/g, '<h3>').replace(/\n/g, '<br/>') }} /> <h3>Nutrition Info (Est. per day)</h3> <p dangerouslySetInnerHTML={{ __html: apiResponse.nutrition?.details.replace(/###/g, '<h3>') }}/> </div> </div> <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3"><button onClick={handleDownloadPDF} disabled={isDownloading} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-slate-400 flex items-center gap-2">{isDownloading ? <Loader2 className="animate-spin"/> : <FileDown size={18}/>} Download PDF</button><button onClick={() => setShowPlanModal(false)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Close</button></div> </div> </div> )}
            {showReplaceModal && ( <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4"> <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm"> <h3 className="p-4 border-b font-semibold">Replace '{ingredientToReplace?.name}'</h3> <div className="p-4 space-y-2"> <label className="text-sm font-medium">Replace with:</label> <input type="text" value={newIngredient} onChange={(e) => setNewIngredient(e.target.value)} placeholder="e.g., 'Ground Beef'" className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"/> </div> <div className="p-4 flex justify-end gap-3 bg-slate-50 rounded-b-xl"> <button onClick={() => setShowReplaceModal(false)} className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300">Cancel</button> <button onClick={handleConfirmReplace} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Evaluate</button> </div> </div> </div> )}
            {showWarningModal && ( <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"> <div className="bg-white rounded-xl shadow-2xl w-full max-w-md"> <h3 className="p-4 border-b font-semibold flex items-center gap-2"><AlertTriangle className="text-yellow-500"/>Potential Impact</h3> <div className="p-4"> <p className="text-slate-700">{warningInfo.message}</p> <p className="mt-4 font-semibold">Do you want to continue with this change?</p> </div> <div className="p-4 flex justify-end gap-3 bg-slate-50 rounded-b-xl"> <button onClick={() => setShowWarningModal(false)} className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300">Cancel</button> <button onClick={() => { warningInfo.onConfirm(); setShowWarningModal(false); }} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">Continue Anyway</button> </div> </div> </div> )}
        </div>
    );
}
