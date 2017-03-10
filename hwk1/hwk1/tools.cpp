#include <vector>
#include <iostream>
#include <string>
#include "tools.h"
#include "CL\cl.h"

/* Tools written by me (Darrell Ross) for use in my code
 */

namespace tools
{
	float GetInput(const std::string& prompt)
	{
		std::cout << prompt;
		float v;
		std::cin >> v;
		return v;
	}

	std::vector<std::string> split(const std::string& str, const char* delim)
	{
		std::vector<std::string> v;
		if (str.empty())
			return v;

		size_t begin = 0;
		for (size_t i = 0; i <= str.size(); i++)
		{
			if (str[i] != *delim && i != str.size())
				continue;

			v.push_back(str.substr(begin, i - begin));
			begin = i + 1;
		}
		return v;
	}

	cl_float randFloat()
	{
		return (cl_float)(rand() % 1000);
	}

	void generateInputFloat4(cl_float4* inputArray, cl_uint arrayWidth, cl_uint arrayHeight)
	{
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i].x = randFloat();
			inputArray[i].y = randFloat();
			inputArray[i].z = randFloat();
			inputArray[i].w = randFloat();
		}
	}

	void generateInputFloat16(cl_float16* inputArray, cl_uint arrayWidth, cl_uint arrayHeight)
	{
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i].s0 = randFloat();
			inputArray[i].s1 = randFloat();
			inputArray[i].s2 = randFloat();
			inputArray[i].s3 = randFloat();
			inputArray[i].s4 = randFloat();
			inputArray[i].s5 = randFloat();
			inputArray[i].s6 = randFloat();
			inputArray[i].s7 = randFloat();
			inputArray[i].s8 = randFloat();
			inputArray[i].s9 = randFloat();
			inputArray[i].sA = randFloat();
			inputArray[i].sB = randFloat();
			inputArray[i].sC = randFloat();
			inputArray[i].sD = randFloat();
			inputArray[i].sE = randFloat();
			inputArray[i].sF = randFloat();
		}
	}

	void generateInputCL(cl_float* inputArray, cl_uint arrayWidth, cl_uint arrayHeight)
	{
		// random initialization of input
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i] = (cl_float)(rand() % 100); // mod to fix possible floating point comparison issues found during office hours with Logan
		}
	}

	void generateInputCLSeq(cl_float* inputArray, cl_uint arrayWidth, cl_uint arrayHeight)
	{
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i] = 1;
		}
	}

	void fillZeros(cl_float* inputArray, cl_uint arrayWidth, cl_uint arrayHeight)
	{
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
			inputArray[i] = 0;
	}

	void generateInputCMatrix(float arr[1024][1024])
	{
		for (size_t i = 0; i < 1024; i++)
		{
			for (size_t j = 0; j < 1024; j++)
			{
				arr[i][j] = (float)(rand() % 100);
			}
		}

	}

	void generateInputC(float* inputArray, size_t arrayWidth, size_t arrayHeight)
	{
		// random initialization of input
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i] = (float)(rand() % 100); // mod to fix possible floating point comparison issues found during office hours with Logan
		}
	}

	// fill STL matrix with random numbers
	void generateInputSTL(std::vector<float>* inputMatrix)
	{
		if (!inputMatrix || inputMatrix->empty())
			throw "invalid input";

		const size_t mSize = inputMatrix->size();
		for (size_t i = 0; i < mSize; i++)
		{
			(*inputMatrix)[i] = (float)(rand() % 100);
		}
	}

	bool verifyEqual(const std::vector<float>& pA, const std::vector<float>& pB)
	{
		if (pA.size() != pB.size())
			return false;
		if (pA.empty() && pB.empty())
			return true;

		const size_t mSize = pA.size();
		for (size_t i = 0; i < mSize; i++)
		{
			if (pA[i] != pB[i])
				return false;
		}
		return true;
	}


} // end namespace tools